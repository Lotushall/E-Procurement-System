# Vendor & Document Approve/Reject/Pending Endpoints

## Context

The internal-user vendor approval UI (`frontend/app/dashboard/vendors/detail/`) already ships and calls six endpoints that don't exist on the backend yet:

```
POST /api/v1/vendors/{id}/approve
POST /api/v1/vendors/{id}/reject
POST /api/v1/vendors/{id}/pending
POST /api/v1/vendors/{vendorId}/documents/{documentId}/approve
POST /api/v1/vendors/{vendorId}/documents/{documentId}/reject
POST /api/v1/vendors/{vendorId}/documents/{documentId}/pending
```

(`frontend/lib/vendor/approval/api.ts`). This was called out explicitly in `frontend/docs/superpowers/specs/2026-08-05-vendor-detail-approval-page-design.md` as backend work for a separate session — this spec is that session.

Only `GET /api/v1/vendors` (list) and `GET /api/v1/vendors/{id}` (show) exist today, in `VendorApprovalController` (`routes/api/v1/dashboard/vendors.php`).

## Confirmed contract (from the shipped frontend)

- Vendor-level and document-level approval are independent — no auto-derivation either direction.
- Rejection always requires a non-empty `remark`; approval never requires one.
- "Pending" (`รอตรวจสอบ`) is a manual admin action to send an already-approved or already-rejected vendor/document back to pending review. It takes no body.
- Buttons for all three actions are shown/hidden purely based on the current status (e.g. the "approve" button is hidden when already approved) — the frontend doesn't otherwise gate by status, so the backend must allow any status → any other status transition.
- Frontend mutations invalidate and refetch rather than consume the response body, but the response should still follow this app's existing `{"message": ..., "data": ...}` / `{"data": ...}` conventions for consistency and manual testability.

## Authorization

No new checks. `index`/`show` on this same controller currently have no server-side role restriction beyond `auth` middleware (any authenticated user, not just internal staff). Adding a `user_type` check here would be exactly the kind of ad-hoc FormRequest-level authorization the user has said they want to avoid duplicating ahead of a planned Policy/middleware-based migration. Confirmed with user: leave consistent with existing endpoints.

## Domain layer

`VendorProfile::approve()` / `reject()` / `resubmit()` already exist and already support any-status-to-any-status transitions — they don't call Spatie's `transitionTo()`, they just construct the new state directly after an idempotency check (`if already in target state, no-op`). No changes needed here.

`VendorDocument` has `approve()` / `reject()` but no plain "back to pending" (only `reupload()`, which also swaps the file — a vendor-side action, not what admin "pending" needs). Add:

```php
public function resubmit(): void
{
    if ($this->status instanceof Pending) {
        return;
    }

    $this->status = new Pending($this);
    $this->verifiedBy = null;
    $this->verifiedAt = null;
    $this->remark = null;
}
```

Mirrors `VendorProfile::resubmit()` exactly.

## Application layer

Six new UseCases in `App\Modules\Vendor\Application\UseCases`, following the existing single-purpose UseCase pattern (see `DeleteVendorDocumentUseCase`):

- `ApproveVendorProfileUseCase::execute(int $vendorProfileId, int $verifiedBy, ?string $remark = null): void`
- `RejectVendorProfileUseCase::execute(int $vendorProfileId, int $verifiedBy, string $remark): void`
- `PendingVendorProfileUseCase::execute(int $vendorProfileId): void`
- `ApproveVendorDocumentUseCase::execute(int $vendorProfileId, int $documentId, int $verifiedBy): void`
- `RejectVendorDocumentUseCase::execute(int $vendorProfileId, int $documentId, int $verifiedBy, string $remark): void`
- `PendingVendorDocumentUseCase::execute(int $vendorProfileId, int $documentId): void`

Each: load the entity via `VendorRepositoryInterface` (`findProfileById` / `findDocumentByVendorProfileIdAndId`), throw `ModelNotFoundException` with a descriptive message if missing, call the domain mutator, save, `app_log(...)` at `info` level on the `vendor` channel (message + old/new status + relevant ids), matching `DeleteVendorDocumentUseCase` / `ResubmitVendorProfileOnChange`'s logging style. No `DB::transaction` — each is a single `save()` call on one row.

## Presentation layer

**New FormRequests** (`App\Modules\Vendor\Presentation\Http\Requests`), `authorize(): true` like every existing request in this module:

- `ApproveVendorRequest` — `remark => ['nullable', 'string']`
- `RejectVendorRequest` — `remark => ['required', 'string']`
- `RejectVendorDocumentRequest` — `remark => ['required', 'string']`

Approve/pending actions (vendor and document) take no body, so they use plain `Illuminate\Http\Request` in the controller (matching `deleteVendorContact(Request $request, int $contact)`), not a dedicated FormRequest.

**`VendorApprovalController`** — inject the six UseCases, add six methods, each ending in a shared private `vendorResponse(int $id)` helper that reuses the existing `GetVendorProfileByIdQuery` + `VendorProfileResource` (same shape `show()` already returns):

```php
public function approve(ApproveVendorRequest $request, int $id): JsonResponse
public function reject(RejectVendorRequest $request, int $id): JsonResponse
public function pending(Request $request, int $id): JsonResponse
public function approveDocument(Request $request, int $vendorId, int $documentId): JsonResponse
public function rejectDocument(RejectVendorDocumentRequest $request, int $vendorId, int $documentId): JsonResponse
public function pendingDocument(Request $request, int $vendorId, int $documentId): JsonResponse
```

No try/catch — this controller currently has none (unlike the vendor-self-service `VendorController`) and lets exceptions bubble to Laravel's default JSON error handling, which is what gives a real 404 for an unknown vendor/document instead of a swallowed 500. Keeping that.

**Routes** (`routes/api/v1/dashboard/vendors.php`), same file, same `auth`-only group:

```php
Route::post('vendors/{id}/approve', [VendorApprovalController::class, 'approve'])->whereNumber('id')->name('vendors.approve');
Route::post('vendors/{id}/reject', [VendorApprovalController::class, 'reject'])->whereNumber('id')->name('vendors.reject');
Route::post('vendors/{id}/pending', [VendorApprovalController::class, 'pending'])->whereNumber('id')->name('vendors.pending');

Route::post('vendors/{vendorId}/documents/{documentId}/approve', [VendorApprovalController::class, 'approveDocument'])->whereNumber(['vendorId', 'documentId'])->name('vendors.documents.approve');
Route::post('vendors/{vendorId}/documents/{documentId}/reject', [VendorApprovalController::class, 'rejectDocument'])->whereNumber(['vendorId', 'documentId'])->name('vendors.documents.reject');
Route::post('vendors/{vendorId}/documents/{documentId}/pending', [VendorApprovalController::class, 'pendingDocument'])->whereNumber(['vendorId', 'documentId'])->name('vendors.documents.pending');
```

## Error handling

- Unknown vendor/document id → `ModelNotFoundException` from the UseCase → Laravel's default 404 JSON response.
- Reject without `remark` (or blank) → 422 from the FormRequest, standard Laravel validation error shape.
- Re-approving an already-approved vendor/document (or equivalent no-op) → succeeds silently (idempotent no-op in the domain entity), returns 200 with unchanged data.

## Out of scope

- Any notification (email/in-app) to the vendor on status change.
- Cascading vendor status from document statuses or vice versa.
- Authorization/Policy changes (tracked separately).
- Bulk approve/reject.

## Testing

Pest feature tests in `tests/Feature/Modules/Vendor/`, one file per action group (or combined per vendor/document level), covering:

- Approve: pending → approved, sets `verified_by`/`verified_at`, clears/sets `remark` per request.
- Reject: requires non-empty `remark` (422 without it), sets rejected + remark + verifier.
- Pending: resets status to pending and clears `verified_by`/`verified_at`/`remark`, works starting from both approved and rejected.
- Same three at the document level, scoped to the correct vendor (404 if the document belongs to a different vendor).
- 404 for a nonexistent vendor id / document id.
