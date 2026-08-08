# Vendor Reject Remark Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the admin's rejection reason (`remark`) wherever a rejected status is already shown, for both individual documents and the vendor as a whole, on both the admin dashboard and the vendor's own self-service pages.

**Architecture:** Purely additive frontend read task — `VendorDocument.remark` and `VendorProfile.remark` are already returned by the backend (`whenNotNull`, so absent when null). Each of 4 render sites gets a small conditional `<p>` shown only when `status === "rejected" && remark` is truthy. No shared component — each site's surrounding layout differs enough that duplicating one line is simpler than parameterizing it.

**Tech Stack:** Next.js, TypeScript, React. No backend changes, no test runner in this repo (manual QA only).

## Global Constraints

- Reason text is always styled `text-red-600`, prefixed with the literal Thai label `เหตุผล: ` (e.g. `เหตุผล: {remark}`) — same phrasing at all 4 sites.
- Every remark render site is gated on the item's own current status being `"rejected"` AND the remark being truthy — never render a stale remark against a non-rejected status.
- `VendorDocument.remark` changes from required `string` to optional `remark?: string` in `lib/vendor/profile/types.ts` — matches actual backend behavior (`whenNotNull` omits the key when null) and the already-optional `VendorProfile.remark?: string`.

---

### Task 1: Document-level remark (type fix + 2 render sites)

**Files:**
- Modify: `lib/vendor/profile/types.ts`
- Modify: `app/dashboard/vendors/detail/_components/vendor-document-approval-row.tsx`
- Modify: `app/(public)/profiles/document/_components/document-row.tsx`

**Interfaces:**
- Consumes: `VendorDocument.remark` (from `lib/vendor/profile/types.ts`), already populated by the backend on any rejected document — no API change needed.
- Produces: nothing consumed by Task 2 — the two tasks are independent and can be done in either order.

- [ ] **Step 1: Loosen `VendorDocument.remark` to optional**

In `lib/vendor/profile/types.ts`, find:

```ts
export interface VendorDocument {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  status: string;
  verifiedBy: User;
  verifiedAt: string;
  remark: string;
}
```

Change the last field to:

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

- [ ] **Step 2: Run `tsc` to confirm no new errors**

Run from `frontend/`: `npx tsc --noEmit`

Expected: the same pre-existing baseline errors as before this change (all in `lib/auth/permissions.ts`, unrelated to this file) — none newly introduced. Widening a required field to optional cannot break existing code that only reads it.

- [ ] **Step 3: Add the remark line to `VendorDocumentApprovalRow`**

In `app/dashboard/vendors/detail/_components/vendor-document-approval-row.tsx`, find:

```tsx
          <p className="flex items-center wrap-break-word text-xs font-thin tracking-wide text-gray-600">
            {document?.fileName ?? "ยังไม่มีเอกสาร"}
          </p>
        </div>
```

Replace with:

```tsx
          <p className="flex items-center wrap-break-word text-xs font-thin tracking-wide text-gray-600">
            {document?.fileName ?? "ยังไม่มีเอกสาร"}
          </p>
          {document?.status === "rejected" && document.remark && (
            <p className="wrap-break-word text-xs text-red-600">เหตุผล: {document.remark}</p>
          )}
        </div>
```

- [ ] **Step 4: Add the remark line to `DocumentRow`**

In `app/(public)/profiles/document/_components/document-row.tsx`, find:

```tsx
          {viewUrl ? (
            <Link
              href={viewUrl}
              target="_blank"
              rel="noopener"
              className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal hover:underline"
            >
              {fileName}
              {fileSize && ` · ${fileSize}`}
            </Link>
          ) : (
            <p className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal">
              {fileName ?? "ยังไม่มีเอกสาร"}
            </p>
          )}
        </div>
```

Replace with:

```tsx
          {viewUrl ? (
            <Link
              href={viewUrl}
              target="_blank"
              rel="noopener"
              className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal hover:underline"
            >
              {fileName}
              {fileSize && ` · ${fileSize}`}
            </Link>
          ) : (
            <p className="flex items-center text-xs text-gray-600 font-thin tracking-wide text-wrap wrap-break-word whitespace-normal">
              {fileName ?? "ยังไม่มีเอกสาร"}
            </p>
          )}
          {existingDocument?.status === "rejected" && existingDocument.remark && (
            <p className="wrap-break-word text-xs text-red-600">เหตุผล: {existingDocument.remark}</p>
          )}
        </div>
```

Note: the guard uses `existingDocument.status`, not the local `statusValue` variable — `statusValue` reads `"pending"` while a fresh reupload is in flight (see `document-row.tsx:108`), and the remark should reflect the persisted document's actual status, not transient reupload state.

- [ ] **Step 5: Run `tsc` again**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same baseline as Step 2, no new errors.

- [ ] **Step 6: Manual verification**

There is no seeded rejected *document* in the dev database (only rejected *vendors* — documents are only ever seeded as pending or approved). Verify against the real flow instead:

1. Start the dev server (`npm run dev`) if not already running.
2. Log in as the seeded admin (`admin@example.com` / `password`).
3. Go to the vendor dashboard list, open any vendor's detail page.
4. Reject one of their documents via the existing "ปฏิเสธ" button/dialog, entering a reason (e.g. "ไฟล์ไม่ชัดเจน").
5. Confirm the reason now appears under that document's filename on this same admin page, styled in red, as `เหตุผล: ไฟล์ไม่ชัดเจน`.
6. Note that vendor's login email (visible on the detail page).
7. Log out, log back in as that vendor (`password` as the password), go to `/profiles/document`.
8. Confirm the same reason appears under that document's filename there too.
9. Re-upload a replacement file for that document type and confirm the remark disappears (status is back to pending).

- [ ] **Step 7: Commit**

```bash
cd frontend
git add lib/vendor/profile/types.ts app/dashboard/vendors/detail/_components/vendor-document-approval-row.tsx "app/(public)/profiles/document/_components/document-row.tsx"
git commit -m "feat(vendor): show document rejection reason on admin and vendor document rows"
```

---

### Task 2: Vendor-level remark (2 render sites)

**Files:**
- Modify: `app/dashboard/vendors/detail/page.tsx`
- Modify: `app/(public)/profiles/_components/navbar.tsx`

**Interfaces:**
- Consumes: `VendorProfile.remark` (already optional in `lib/vendor/profile/types.ts`) — no type change needed for this task.

- [ ] **Step 1: Add the remark to the admin vendor detail header**

In `app/dashboard/vendors/detail/page.tsx`, find:

```tsx
          <div className="flex flex-col gap-0.5">
            <VendorStatusBadge status={vendor.verificationStatus} />
            <div className="h-4" />
          </div>
```

Replace with:

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

The `<div className="h-4" />` is a spacer that keeps the badge vertically centered next to the name/email block when there's nothing else in this column — kept as the fallback so the layout doesn't shift when there's no remark to show. `max-w-60` keeps a long remark from stretching this column; it wraps instead.

- [ ] **Step 2: Add a `RejectRemark` component to the vendor self-service navbar**

In `app/(public)/profiles/_components/navbar.tsx`, find the end of the `StatusBadge` component (right before `export default function Navbar()`):

```tsx
    return (
        <Badge
            variant="secondary"
            className={cn(
                "flex items-center gap-1.75 text-sm tracking-wide font-bold px-3.5 py-3 h-8",
                status.badge
            )}
        >
            <span className={cn("w-1.75 h-1.75 rounded-full", status.dot)} />
            {status.label}
        </Badge>
    )
}

export default function Navbar() {
```

Insert a new component between them:

```tsx
    return (
        <Badge
            variant="secondary"
            className={cn(
                "flex items-center gap-1.75 text-sm tracking-wide font-bold px-3.5 py-3 h-8",
                status.badge
            )}
        >
            <span className={cn("w-1.75 h-1.75 rounded-full", status.dot)} />
            {status.label}
        </Badge>
    )
}

const RejectRemark = () => {
    const { data: vendor } = useVendorProfile()

    if (vendor?.verificationStatus !== "rejected" || !vendor.remark) {
        return null;
    }

    return <p className="text-xs text-red-600">เหตุผล: {vendor.remark}</p>;
}

export default function Navbar() {
```

`useVendorProfile()` is already imported in this file (used by `StatusBadge`) — no new import needed. React Query dedupes identical concurrent queries, so this second call doesn't trigger an extra network request.

- [ ] **Step 3: Render `RejectRemark` in the navbar layout**

In the same file, find:

```tsx
            <div className="flex flex-col">
                <div className="flex justify-between items-center">
                    <h1 className="text-[26px] font-bold">ข้อมูลผู้ค้า</h1>
                    <StatusBadge />
                </div>

                <p className="text-sm tracking-wide text-gray-600">จัดการข้อมูลบริษัท ผู้ติดต่อ และเอกสารประกอบสำหรับการขึ้นทะเบียน</p>
            </div>
```

Replace with:

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

- [ ] **Step 4: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same pre-existing baseline as Task 1's Step 2/5, no new errors.

- [ ] **Step 5: Manual verification**

The dev database already has 20 seeded rejected vendors (`VendorSeeder`'s `REJECTED_COUNT` bucket) with the fixture remark `"Rejected during testing."`.

1. Start the dev server if not already running.
2. Log in as admin, open the vendor list, filter or scan for a vendor with status "ถูกปฏิเสธ".
3. Open that vendor's detail page — confirm `เหตุผล: Rejected during testing.` appears under the status badge in the header.
4. Note that vendor's login email.
5. Log out, log in as that vendor (`password`), land on `/profiles`.
6. Confirm `เหตุผล: Rejected during testing.` appears under the description text in the navbar — check this holds on every `/profiles/*` sub-page (`/profiles`, `/profiles/vendor-info`, `/profiles/document`, `/profiles/contract`), since the navbar is shared via `app/(public)/profiles/layout.tsx`.
7. As admin, change that vendor's status to "รอตรวจสอบ" (pending) or "อนุมัติ" (approved) and confirm the remark disappears from both places.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add app/dashboard/vendors/detail/page.tsx "app/(public)/profiles/_components/navbar.tsx"
git commit -m "feat(vendor): show vendor rejection reason on admin detail page and vendor navbar"
```
