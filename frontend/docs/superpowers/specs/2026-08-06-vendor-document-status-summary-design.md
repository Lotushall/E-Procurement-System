# Vendor Document Status Summary (Vendor List "สถานะเอกสาร" Column)

## Context

`app/dashboard/vendors/_components/table/columns.tsx:121-142` currently defines two columns with the same `id: "verification_status"`, both driven by the same `accessorFn: (vendor) => vendor.verificationStatus` and rendering the same `VendorStatusBadge` — one headed "สถานะ", the other "สถานะเอกสาร". This is a leftover duplicate: it doesn't show anything about the vendor's actual documents, and the duplicate column `id` is itself a bug (`@tanstack/react-table` expects unique ids).

`vendor.verificationStatus` (`lib/vendor/profile/types.ts:60`) is a manually-set overall decision an admin makes for the vendor as a whole (via the approve/reject/pending buttons on `app/dashboard/vendors/detail/page.tsx`). It is independent from the per-document review that happens on the same detail page (`vendor-document-approval-row.tsx`), where each `VendorDocument.status` (`pending` / `approved` / `rejected`) is set individually. There is currently no derived view of "how are this vendor's documents doing, in aggregate" anywhere in the list table.

The list endpoint (`ListVendorProfilesQuery::execute`, `backend/app/Modules/Vendor/Application/Queries/ListVendorProfilesQuery.php:21`) does not eager-load documents at all — it only selects `id, created_at, verification_status` plus lightweight detail/contact columns, for performance across a paginated vendor list. The detail endpoint (`GetVendorProfileByIdQuery`) does eager-load the full `VendorProfilesDocuments` collection, but that's for per-document approval rows, not a table summary.

## Decision

Replace the second (duplicate) column with a real "สถานะเอกสาร" column that shows a **per-status count breakdown** of the vendor's documents — e.g. 1 approved, 2 pending, 1 rejected — as small colored dot+count chips, instead of a single collapsed status. This was chosen over collapsing to one worst-status-wins badge (e.g. "ปฏิเสธบางส่วน") because it tells the admin exactly how many documents need attention at a glance, without an extra click into the detail page.

Counts are computed on the backend via SQL aggregation (`withCount` with per-status constraints), not by eager-loading full document rows — the list only needs three integers per vendor, not the underlying records, keeping the list query's existing lightweight-select design intact.

## Backend

### `ListVendorProfilesQuery::execute()`

Add three correlated-subquery counts alongside the existing `select`/`with`:

```php
$query = VendorProfiles::query()
    ->select(['id', 'created_at', 'verification_status'])
    ->withCount([
        'VendorProfilesDocuments as approved_documents_count' => fn (Builder $q) => $q->where('status', 'approved'),
        'VendorProfilesDocuments as pending_documents_count' => fn (Builder $q) => $q->where('status', 'pending'),
        'VendorProfilesDocuments as rejected_documents_count' => fn (Builder $q) => $q->where('status', 'rejected'),
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

`status` on `vendor_documents` is a Spatie `ModelStates` cast (`DocumentStatus::class`), but the underlying DB column stores the plain string (`pending`/`approved`/`rejected`, per each state's `protected static ?string $name`), so filtering with a raw string in the `withCount` closure is correct and matches the existing `VendorProfiles::status()` scope's approach of comparing `verification_status` as a raw string.

This applies to both the `paginate()` and plain `get()` branches since they share the same `$query` builder — no branching needed.

### `VendorProfileResource`

Add a conditional field, following this resource's existing `whenNotNull`/`whenLoaded` pattern for data that isn't always present:

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

`isset($this->approved_documents_count)` is `true` only when the query added the `withCount` aliases (i.e. the list endpoint), so the field is simply absent from responses that don't compute it (self-service profile, `show`/detail) rather than misleadingly reporting `0/0/0`.

## Frontend

### `lib/vendor/profile/types.ts`

```ts
export interface VendorProfile {
  // ...existing fields
  documentStatusCounts?: {
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

Optional because it's only populated by the list endpoint.

### `app/dashboard/vendors/_components/table/columns.tsx`

Replace the second `verification_status` column (lines 132-142) with:

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

Dot colors reuse the exact classes `VendorStatusBadge` (`components/vendor-status-badge.tsx:5-7`) already uses for `pending`/`approved`/`rejected`, so the color language stays consistent across the app. `DocumentStatusCount` stays local to `columns.tsx` (not extracted into a shared component) since it has exactly one consumer, matching this codebase's established "local copy until a third consumer appears" convention (see `docs/superpowers/specs/2026-07-18-vendor-document-checklist-design.md`).

Order is approved → pending → rejected (calm-to-urgent reading order); zero-count statuses are omitted entirely rather than shown as "0" to keep the cell compact.

## Edge Cases

- **No documents uploaded at all**: `documentStatusCounts` is `{approved: 0, pending: 0, rejected: 0}` (or the vendor row simply lacks the field, if some future code path constructs `VendorProfileResource` without the counts) — both render as `-`, consistent with the `business_type` column's existing `-` fallback for missing data.
- **A vendor is missing some required document types entirely** (e.g. submitted 2 of 5 required documents, both approved): this only shows "✓2" with no indication that 3 are missing. Surfacing "incomplete submission" is out of scope for this change — it would require cross-referencing against `REQUIRED_DOCUMENTS` (`app/(public)/profiles/data/document-types.ts`), which is a vendor-self-service concept not currently threaded through to the admin list.
- **Detail/self-service endpoints**: `documentStatusCounts` is never computed there (no `withCount` applied), so the field is simply absent from those JSON responses — no dead/misleading zeros.

## Testing

### Backend (`tests/Feature/Modules/Vendor/ListVendorsTest.php`)

Add a test that creates a vendor, attaches documents via `$repository->saveDocument(VendorDocument::create(...))`, transitions some via `->approve(verifiedBy: ...)` / `->reject(verifiedBy: ...)` followed by `saveDocument()` again to persist the transition, then asserts `data.0.documentStatusCounts` matches the expected `{approved, pending, rejected}` breakdown. Include a vendor with zero documents and assert its counts are all `0`.

### Frontend

No test runner is configured in this repo (consistent with prior frontend specs). Manual verification: open the vendor list as an internal user, confirm the "สถานะเอกสาร" column shows the right colored dot+count combination for a vendor with mixed document statuses, shows `-` for a vendor with no documents, and check both light and dark mode.
