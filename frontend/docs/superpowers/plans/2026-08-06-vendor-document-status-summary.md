# Vendor Document Status Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated "สถานะเอกสาร" column in the vendor list table with a real per-status document count breakdown (approved/pending/rejected), backed by a new `documentStatusCounts` field on the vendor list endpoint.

**Architecture:** Backend computes three per-vendor document counts via SQL `withCount` (correlated subqueries, no extra rows loaded) in `ListVendorProfilesQuery`, exposes them conditionally on `VendorProfileResource`. Frontend consumes the new field in a rewritten table column that renders small colored dot+count chips instead of the current duplicate badge column.

**Tech Stack:** Laravel 11 + Pest (backend), Next.js + TanStack Table + TypeScript (frontend).

## Global Constraints

- `status` on `vendor_documents` is stored as a raw string (`pending`/`approved`/`rejected`) in the DB despite the `DocumentStatus` state cast — filter with raw strings in query builder closures, per `spec:2026-08-06-vendor-document-status-summary-design.md`.
- `documentStatusCounts` must be **absent** (not zeroed) from any `VendorProfileResource` response that didn't compute it via `withCount` (i.e. everywhere except the list endpoint).
- Dot colors in the frontend chip must reuse the exact Tailwind classes already used in `components/vendor-status-badge.tsx` (`bg-green-800` / `bg-yellow-600` / `bg-red-600`) — no new color values.
- Zero-count statuses are omitted from the cell entirely (not shown as "0").

---

### Task 1: Backend — `documentStatusCounts` on the vendor list endpoint

**Files:**
- Modify: `backend/app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php`
- Modify: `backend/app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php`
- Test: `backend/tests/Feature/Modules/Vendor/ListVendorsTest.php`

**Interfaces:**
- Produces: JSON field `documentStatusCounts: { approved: int, pending: int, rejected: int } | absent` on each element of `data` in `GET /api/v1/vendors` responses. Task 2 consumes this exact shape.

- [ ] **Step 1: Write the failing tests**

Add to the end of `backend/tests/Feature/Modules/Vendor/ListVendorsTest.php` (needs `VendorDocument` imported alongside the other `use` statements at the top of the file — add `use App\Modules\Vendor\Domain\Entities\VendorDocument;`):

```php
test('listing vendors includes a document status count breakdown', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;

    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Doc Status Co.',
        businessRegistrationNo: '5000000000001',
        taxId: TaxId::fromString('5000000000001'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $approvedDoc = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'citizen_id',
        fileName: 'citizen_id.pdf',
        filePath: 'vendor-documents/citizen_id.pdf',
    ));
    $approvedDoc->approve(verifiedBy: $internalUser->id);
    $repository->saveDocument($approvedDoc);

    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'house_registration',
        fileName: 'house_registration.pdf',
        filePath: 'vendor-documents/house_registration.pdf',
    ));

    $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'commercial_registration',
        fileName: 'commercial_registration.pdf',
        filePath: 'vendor-documents/commercial_registration.pdf',
    ));

    $rejectedDoc = $repository->saveDocument(VendorDocument::create(
        vendorProfileId: $profile->id(),
        documentType: 'vat_registration',
        fileName: 'vat_registration.pdf',
        filePath: 'vendor-documents/vat_registration.pdf',
    ));
    $rejectedDoc->reject(verifiedBy: $internalUser->id, remark: 'Illegible scan');
    $repository->saveDocument($rejectedDoc);

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertOk()
        ->assertJsonPath('data.0.documentStatusCounts.approved', 1)
        ->assertJsonPath('data.0.documentStatusCounts.pending', 2)
        ->assertJsonPath('data.0.documentStatusCounts.rejected', 1);
});

test('a vendor with no documents has zero document status counts', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;

    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'No Docs Co.',
        businessRegistrationNo: '5000000000002',
        taxId: TaxId::fromString('5000000000002'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson('/api/v1/vendors');

    $response->assertOk()
        ->assertJsonPath('data.0.documentStatusCounts.approved', 0)
        ->assertJsonPath('data.0.documentStatusCounts.pending', 0)
        ->assertJsonPath('data.0.documentStatusCounts.rejected', 0);
});

test('a vendor detail response does not include document status counts', function () {
    $internalUser = User::factory()->create(['user_type' => 'internal']);
    $repository = new VendorRepository;

    $vendorUser = User::factory()->create(['user_type' => 'company']);
    $profile = $repository->saveProfile(VendorProfile::create(userId: $vendorUser->id));
    $repository->saveCompanyDetail(VendorCompanyDetail::create(
        vendorProfileId: $profile->id(),
        companyName: 'Detail Co.',
        businessRegistrationNo: '5000000000003',
        taxId: TaxId::fromString('5000000000003'),
        branchNo: null,
        businessType: null,
        address: null,
        province: null,
        postalCode: null,
    ));

    $this->actingAs($internalUser, 'web');

    $response = $this->getJson("/api/v1/vendors/{$profile->id()}");

    $response->assertOk();
    expect($response->json('data'))->not->toHaveKey('documentStatusCounts');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run from `backend/`: `php artisan test --filter="document status"`

Expected: the first two tests FAIL because `documentStatusCounts` is missing/null in the response (assertion errors on `assertJsonPath`); the third test PASSES already (the key doesn't exist yet anywhere) — that's fine, it's a regression guard for the next step, not proof of current behavior.

- [ ] **Step 3: Add the counts to the query and resource**

In `backend/app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php`, change the `$query` assignment (currently starting at line 21) to add `withCount` between `select` and `with`:

```php
$query = VendorProfiles::query()
    ->select(['id', 'created_at', 'verification_status'])
    ->withCount([
        'VendorProfilesDocuments as approved_documents_count' => fn ($q) => $q->where('status', 'approved'),
        'VendorProfilesDocuments as pending_documents_count' => fn ($q) => $q->where('status', 'pending'),
        'VendorProfilesDocuments as rejected_documents_count' => fn ($q) => $q->where('status', 'rejected'),
    ])
    ->with([
        'VendorProfilesCompanyDetail:vendor_profile_id,company_name,business_type',
        'VendorProfilesIndividualDetail:vendor_profile_id,store_name,business_type',
        'VendorProfilesContact:vendor_profile_id,contact_email,contact_phone,is_main_contact',
    ])
    ->status($status)
    ->search($search)
    ->sort($sortBy, $sortDirection)
    ->orderByDesc('id');
```

In `backend/app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php`, add a new array entry right after `'remark' => $this->whenNotNull($this->remark),` (line 26):

```php
'documentStatusCounts' => $this->when(
    isset($this->approved_documents_count),
    fn () => [
        'approved' => (int) $this->approved_documents_count,
        'pending' => (int) $this->pending_documents_count,
        'rejected' => (int) $this->rejected_documents_count,
    ],
),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run from `backend/`: `php artisan test --filter="document status"`

Expected: all three tests PASS.

- [ ] **Step 5: Run the full vendor test suite to check for regressions**

Run from `backend/`: `php artisan test --filter=Vendor`

Expected: all tests PASS (existing `ListVendorsTest`/`ShowVendorTest` assertions on `assertJsonStructure`/`toMatchArray` don't assert an exhaustive key set, so the new field doesn't break them).

- [ ] **Step 6: Commit**

```bash
cd backend
git add app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php app/Modules/Vendor/Presentation/Http/Resources/VendorProfileResource.php tests/Feature/Modules/Vendor/ListVendorsTest.php
git commit -m "feat(vendor): add per-status document count breakdown to vendor list"
```

---

### Task 2: Frontend — "สถานะเอกสาร" column renders the count breakdown

**Files:**
- Modify: `frontend/lib/vendor/profile/types.ts`
- Modify: `frontend/app/dashboard/vendors/_components/table/columns.tsx`

**Interfaces:**
- Consumes: `documentStatusCounts?: { approved: number; pending: number; rejected: number }` produced by Task 1, added to `VendorProfile`.

- [ ] **Step 1: Add the field to the `VendorProfile` type**

In `frontend/lib/vendor/profile/types.ts`, add `documentStatusCounts` to the `VendorProfile` interface (currently lines 58-68):

```ts
export interface VendorProfile {
  id: number;
  verificationStatus: VendorVerificationStatus;
  verifiedAt?: string;
  remark?: string;
  detail: VendorProfileDetail;
  contact: VendorContact[];
  document?: VendorDocument[];
  documentStatusCounts?: {
    approved: number;
    pending: number;
    rejected: number;
  };
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Replace the duplicate column in `columns.tsx`**

In `frontend/app/dashboard/vendors/_components/table/columns.tsx`, the file currently has two columns both with `id: "verification_status"` (lines 121-142) — one headed "สถานะ" (keep as-is), one headed "สถานะเอกสาร" (replace).

First, add this helper above `export const columns` (after the `VENDOR_TYPE_ICON` constant, currently ending at line 61):

```tsx
const DOCUMENT_STATUS_DOT: Record<"approved" | "pending" | "rejected", string> = {
    approved: "bg-green-800",
    pending: "bg-yellow-600",
    rejected: "bg-red-600",
}

function DocumentStatusCount({
    status,
    count,
}: {
    status: "approved" | "pending" | "rejected"
    count: number
}) {
    return (
        <span className="flex items-center gap-1 text-xs font-medium text-gray-700">
            <span className={cn("w-1.75 h-1.75 rounded-full", DOCUMENT_STATUS_DOT[status])} />
            {count}
        </span>
    )
}
```

Then replace the second `verification_status` column block (lines 132-142):

```tsx
    {
        id: "verification_status",
        header: () => <div className="text-center">สถานะเอกสาร</div>,
        enableSorting: false,
        accessorFn: (vendor) => vendor.verificationStatus,
        cell: ({ getValue }) => (
            <div className="flex justify-center">
                <VendorStatusBadge status={getValue<string>()} />
            </div>
        ),
    },
```

with:

```tsx
    {
        id: "document_status",
        header: () => <div className="text-center">สถานะเอกสาร</div>,
        enableSorting: false,
        accessorFn: (vendor) => vendor.documentStatusCounts,
        cell: ({ getValue }) => {
            const counts = getValue<VendorProfile["documentStatusCounts"]>()
            const total = (counts?.approved ?? 0) + (counts?.pending ?? 0) + (counts?.rejected ?? 0)

            if (!counts || total === 0) {
                return <div className="flex justify-center text-muted-foreground">-</div>
            }

            return (
                <div className="flex justify-center gap-2.5">
                    {counts.approved > 0 && <DocumentStatusCount status="approved" count={counts.approved} />}
                    {counts.pending > 0 && <DocumentStatusCount status="pending" count={counts.pending} />}
                    {counts.rejected > 0 && <DocumentStatusCount status="rejected" count={counts.rejected} />}
                </div>
            )
        },
    },
```

- [ ] **Step 3: Type-check**

Run from `frontend/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Manual verification**

Start the dev server (`npm run dev`) and open the vendor list as an internal user:
- A vendor with documents in more than one status shows the matching colored dot+count chips (green/yellow/red), in approved → pending → rejected order.
- A vendor with no documents (or a backend not yet returning the field) shows `-`.
- Check both light and dark mode — dot colors and chip text remain legible in both.
- Confirm no React "duplicate key" warning for `verification_status` appears in the browser console (the column `id` collision from before this task is now resolved).

- [ ] **Step 5: Commit**

```bash
cd frontend
git add lib/vendor/profile/types.ts app/dashboard/vendors/_components/table/columns.tsx
git commit -m "feat(vendor-list): show document status count breakdown instead of duplicate status badge"
```
