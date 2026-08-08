# Show Reject Remark on Document and Vendor Rejection

## Context

When an admin rejects a document (`VendorDocumentApprovalRow`'s `RejectReasonDialog`) or an entire vendor (`app/dashboard/vendors/detail/page.tsx`'s `RejectReasonDialog`), they capture a free-text reason and it's persisted as `remark` — `VendorDocument.remark` per document, `VendorProfile.remark` for the vendor overall. Both are already returned by the backend (`VendorDocumentResource.php:27`, `VendorProfileResource.php:26`, both via `whenNotNull`), but nothing in the frontend reads either field — a rejected vendor or document shows only a red "ถูกปฏิเสธ"/"ไม่อนุมัติ" badge with no indication of *why*, on either the admin side or the vendor's own self-service side.

This is a pure frontend read task: no backend changes needed. Both fields are already wired from database → resource → API response; only the display is missing.

## Decision

Add the remark as a small line of red text, shown only when the corresponding item is actually `rejected` and a remark exists, at four render sites — two for document-level remarks, two for vendor-level remarks:

| # | Level | File | Context |
|---|-------|------|---------|
| 1 | Document | `app/dashboard/vendors/detail/_components/vendor-document-approval-row.tsx` | Admin reviewing one vendor's documents |
| 2 | Document | `app/(public)/profiles/document/_components/document-row.tsx` | Vendor viewing their own documents |
| 3 | Vendor | `app/dashboard/vendors/detail/page.tsx` | Admin's vendor detail header |
| 4 | Vendor | `app/(public)/profiles/_components/navbar.tsx` | Vendor's own profile header (shown on every `/profiles/*` page via the shared layout) |

No shared component: each site's surrounding markup differs enough (action buttons, badge placement, flex direction) that a one-line `<p>` is simpler duplicated four times than parameterized once, consistent with this codebase's established "local copy until a real third consumer with identical shape appears" convention.

## Part 1: `lib/vendor/profile/types.ts`

`VendorDocument.remark` is currently typed as required `string` (`types.ts:41`), but the backend's `whenNotNull` omits the key entirely when null — the same pattern `VendorProfile.remark?: string` already accounts for correctly. Tighten it to match:

```ts
export interface VendorDocument {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  status: string;
  verifiedBy: User;
  verifiedAt: string;
  remark?: string;
}
```

Confirmed via repo-wide grep that no code currently reads `VendorDocument.remark` — this task is its first consumer, so the tightened type can't break anything.

## Part 2: `VendorDocumentApprovalRow` (admin, document-level)

Current structure (`vendor-document-approval-row.tsx:113-115`): the filename `<p>` is the last element inside the text column `<div>` (`vendor-document-approval-row.tsx:80-116`). Add the remark line immediately after it, inside the same wrapping `<div>`:

```tsx
          <p className="flex items-center wrap-break-word text-xs font-thin tracking-wide text-gray-600">
            {document?.fileName ?? "ยังไม่มีเอกสาร"}
          </p>
          {document?.status === "rejected" && document.remark && (
            <p className="wrap-break-word text-xs text-red-600">เหตุผล: {document.remark}</p>
          )}
        </div>
```

## Part 3: `DocumentRow` (vendor self-service, document-level)

Current structure (`document-row.tsx:169-183`): a conditional block renders either a linked filename or a plain filename `<p>`, both inside the text column `<div>` (`document-row.tsx:137-184`). Add the remark line after that conditional block, still inside the same `<div>`:

```tsx
          {viewUrl ? (
            <Link ...>{fileName}{fileSize && ` · ${fileSize}`}</Link>
          ) : (
            <p ...>{fileName ?? "ยังไม่มีเอกสาร"}</p>
          )}
          {existingDocument?.status === "rejected" && existingDocument.remark && (
            <p className="wrap-break-word text-xs text-red-600">เหตุผล: {existingDocument.remark}</p>
          )}
        </div>
```

Note the guard is against `existingDocument.status`, not `statusValue` — `statusValue` is `"pending"` while a fresh reupload is in flight (`document-row.tsx:108`), and the remark line should reflect the persisted document's last-known rejection, not the transient re-upload state. Once the reupload succeeds, `existingDocument` itself updates via query invalidation and `status` will no longer be `"rejected"`.

## Part 4: Admin vendor detail header (vendor-level)

Current structure (`app/dashboard/vendors/detail/page.tsx:80-83`):

```tsx
          <div className="flex flex-col gap-0.5">
            <VendorStatusBadge status={vendor.verificationStatus} />
            <div className="h-4" />
          </div>
```

The empty `<div className="h-4" />` is a spacer keeping the badge vertically centered next to the name/email block when there's nothing else in this column. Replace it with the remark when present, keeping the spacer as a fallback so the layout doesn't jump when there's no remark:

```tsx
          <div className="flex flex-col gap-0.5">
            <VendorStatusBadge status={vendor.verificationStatus} />
            {vendor.verificationStatus === "rejected" && vendor.remark ? (
              <p className="max-w-60 text-xs text-red-600">เหตุผล: {vendor.remark}</p>
            ) : (
              <div className="h-4" />
            )}
          </div>
```

`max-w-60` keeps a long remark from stretching the header's flex row disproportionately next to the name; it wraps instead.

## Part 5: Vendor self-service navbar (vendor-level)

Current structure (`app/(public)/profiles/_components/navbar.tsx:60-78`): `StatusBadge` is a sibling of the `<h1>` title inside a `flex justify-between` row, with a description `<p>` below both. Since `StatusBadge` doesn't have access to `vendor.remark` today (it only destructures `vendor.verificationStatus` after loading), add the remark as its own line under the title+badge row, alongside the existing description paragraph:

```tsx
            <div className="flex flex-col">
                <div className="flex justify-between items-center">
                    <h1 className="text-[26px] font-bold">ข้อมูลผู้ค้า</h1>
                    <StatusBadge />
                </div>

                <p className="text-sm tracking-wide text-gray-600">จัดการข้อมูลบริษัท ผู้ติดต่อ และเอกสารประกอบสำหรับการขึ้นทะเบียน</p>
                <RejectRemark />
            </div>
```

`StatusBadge` already calls `useVendorProfile()` itself — rather than duplicating that fetch, add a second small component in the same file reusing the same hook (React Query dedupes identical concurrent queries, so this doesn't cause an extra network request):

```tsx
const RejectRemark = () => {
    const { data: vendor } = useVendorProfile()

    if (vendor?.verificationStatus !== "rejected" || !vendor.remark) {
        return null;
    }

    return <p className="text-xs text-red-600">เหตุผล: {vendor.remark}</p>;
}
```

Placed in `navbar.tsx` right after `StatusBadge`'s definition.

## Edge Cases

- **Remark exists but status later changes back to non-rejected** (e.g. admin re-approves, or a vendor reuploads a rejected document): the `status === "rejected"` guard at every site means the remark simply stops rendering the moment the underlying data reflects the new status — no stale-remark risk, since `remark` isn't cleared server-side but the display is fully gated on current status.
- **Long remarks**: all four sites use `wrap-break-word` (documents) or rely on the block already being full-width (vendor header uses `max-w-60` since it sits in a horizontal flex row next to the name).
- **`vendor.remark` missing even though rejected** (shouldn't happen in practice since the reject dialog requires a reason, but the field is optional in the type): the `&& vendor.remark` / `&& document.remark` guards mean nothing renders — same silent-omission behavior as every other optional field in this codebase, not a new pattern.

## Testing

No test runner in this frontend repo (consistent with every prior frontend spec in this project). Manual verification: reject a document with a reason, confirm the reason appears on both the admin approval row and the vendor's own document row; reject a whole vendor with a reason, confirm it appears on both the admin detail header and the vendor's own navbar (on every `/profiles/*` sub-page, since the layout is shared); re-approve and confirm the remark disappears from all four locations; check light mode (this whole area is hardcoded light per prior specs, no dark mode to verify).
