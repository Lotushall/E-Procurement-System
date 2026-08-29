# Vendor Delete (Frontend) Design

## Goal

Give Admin a way to delete a vendor from the frontend Vendor dashboard,
calling the already-implemented backend endpoint.

## Background

Backend already ships `DELETE /api/v1/vendors/{id}` (see
`backend/docs/superpowers/specs/2026-08-28-vendor-delete-and-purge-design.md`):
soft-deletes the linked user account, returns 204, guarded by
`can:vendors.destroy` middleware, and the vendor disappears from
`GET /vendors` and its status counts once deleted. That backend plan
explicitly scoped the delete *button* itself out ("Frontend UI for the
delete button (backend only, per user request)") — this spec closes that
gap.

The codebase already has an established pattern for this exact shape of
action:

- `app/dashboard/internal-employees/_components/delete-internal-profile-dialog.tsx`
  — an `AlertDialog` with a hardcoded icon-only trigger, used as a table
  row action.
- `app/dashboard/vendors/_components/reject-reason-dialog.tsx` — an
  `AlertDialog`-style dialog that instead accepts a `trigger` render prop,
  because it's used from the vendor detail page's action-button row (not a
  table).

Vendor delete needs both placements (list row action AND detail-page
button), so it follows the `reject-reason-dialog.tsx` shape: one component,
trigger passed in by the caller.

## Component: `DeleteVendorDialog`

New file: `app/dashboard/vendors/_components/delete-vendor-dialog.tsx`.

```tsx
function DeleteVendorDialog({
  vendorId,
  displayName,
  trigger,
  triggerChildren,
  onSuccess,
}: {
  vendorId: number;
  displayName: string;
  trigger: ReactElement;
  triggerChildren: ReactNode;
  onSuccess?: () => void;
}): JSX.Element
```

- Internally renders `<AlertDialogTrigger render={trigger}>{triggerChildren}</AlertDialogTrigger>`
  — the exact same split `RejectReasonDialog` and `DeleteInternalProfileDialog`
  already use: `trigger` is a *bare* element (e.g. `<Button variant="outline" className="..." />`,
  no children of its own), `triggerChildren` is what's rendered inside it
  (an icon in the table, a text label on the detail page). Callers never
  wrap `trigger` in `AlertDialogTrigger` themselves — the dialog owns that.
- No `disabledReason`/self-delete guard — unlike
  `DeleteInternalProfileDialog`, a vendor account can never be the acting
  admin (backend design doc confirms: acting user is always `internal`
  type, vendor being deleted is always `company` type).
- `open`/`setOpen` state local to the component, same as
  `DeleteInternalProfileDialog`.
- On confirm: `toast.promise(deleteVendor.mutateAsync(vendorId), {...})`,
  with `setOpen(false)` only inside the toast's `success` callback — the
  dialog stays open (confirm button disabled) for the duration of the
  mutation, same as `DeleteInternalProfileDialog`. This is deliberately
  different from `RejectReasonDialog`, which closes immediately on confirm
  and shows loading state via the outer trigger's `triggerChildren`
  instead — that only works because `RejectReasonDialog` doesn't own its
  mutation (the caller does). Since `DeleteVendorDialog` owns its mutation
  and stays open while pending, neither caller needs to compute a dynamic
  `triggerChildren` for loading state; it's always the static icon/label.
  On success: call `onSuccess?.()` (used by the detail page to redirect;
  the table doesn't pass it — the row just disappears via query
  invalidation).
- Copy:
  - Title: `ลบผู้ค้า`
  - Description: `` ต้องการลบผู้ค้า "{displayName}" ใช่หรือไม่? ``
  - Confirm button label: `ลบผู้ค้า` (loading: `กำลังลบผู้ค้า...`)
  - Toast: loading `กำลังลบผู้ค้า...`, success `ลบผู้ค้าสำเร็จ`, error via
    the same `getErrorMessage(error)` shape used in every other vendor
    dialog/hook in this folder (Axios error message, fallback
    `ลบผู้ค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง`).

## Data layer

Mirrors the existing `approveVendor` / `useApproveVendor` pair exactly.

`lib/vendor/approval/api.ts` — add:

```ts
export async function deleteVendor(id: number): Promise<void> {
  await api.delete(`/api/v1/vendors/${id}`);
}
```

`lib/vendor/approval/mutations/useDeleteVendor.ts` — new file:

```ts
import { useMutation } from "@tanstack/react-query";
import { deleteVendor } from "@/lib/vendor/approval/api";
import { useInvalidateVendors } from "./useInvalidateVendors";

export function useDeleteVendor() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (id: number) => deleteVendor(id),
    onSettled: invalidate,
  });
}
```

Reuses the existing `useInvalidateVendors()` (invalidates the `["vendors"]`
query key) — no new query key needed. This invalidates both the list query
(row disappears) and the detail query if it happens to be mounted.

## Wiring

### 1. Vendor list table — `app/dashboard/vendors/_components/table/columns.tsx`

In the `actions` column's cell, add a trash icon button next to the
existing "Eye" view button (same `flex justify-center gap-1.5` container
already used by `internal-employees/_components/table/columns.tsx` for its
multi-icon actions cell — the vendors table currently only has one icon,
so this cell's className changes from `flex justify-center` to
`flex justify-center gap-1.5`):

```tsx
<DeleteVendorDialog
  vendorId={row.original.id}
  displayName={
    row.original.detail.type === "company"
      ? row.original.detail.companyName
      : row.original.detail.storeName
  }
  trigger={
    <Button
      variant="outline"
      aria-label="ลบผู้ค้า"
      className="size-8 px-1.5 pt-px rounded-md bg-white"
    />
  }
  triggerChildren={<Trash2 className="w-4 h-4 text-red-600" />}
/>
```

No `onSuccess` passed — list row removal is handled entirely by query
invalidation, same as approve/reject already work on this list.

### 2. Vendor detail page — `app/dashboard/vendors/detail/page.tsx`

Add a destructive delete button to the existing action-button row
(alongside รอตรวจสอบ/อนุมัติผู้ค้า/ปฏิเสธผู้ค้า), positioned first (leftmost)
in that row so it's visually separated from the status-transition actions.
On success, redirect to the vendor list via `useRouter()` from
`next/navigation` (not currently imported in this file — needs adding):

```tsx
<DeleteVendorDialog
  vendorId={vendorId}
  displayName={displayName ?? ""}
  trigger={<Button type="button" variant="destructive" disabled={isVendorActionPending} />}
  triggerChildren="ลบผู้ค้า"
  onSuccess={() => router.push(routes.dashboards.vendors.index)}
/>
```

`triggerChildren` is a static label here (not a `deleteVendor.isPending`
ternary like the other three buttons' inline text) — per the component
contract above, the dialog stays open with its own confirm button
disabled for the whole mutation, so the outer trigger is never visible
mid-mutation and never needs a loading label.

`isVendorActionPending` (already computed in this file from
approve/reject/pending `.isPending`) is not extended to include the delete
mutation's pending state — the delete dialog manages its own button
disabled/loading state internally like `DeleteInternalProfileDialog`
does, and disabling the *other* three action buttons while a delete
confirmation is merely open (not yet confirmed) isn't needed since they're
mutually exclusive user actions gated behind the same modal dialog.

## Error handling

Same shape as every other vendor mutation in this codebase: Axios error's
`response.data.message` if present, else a Thai fallback string. A 403
(missing `vendors.destroy` permission) or 404 (vendor already gone) both
surface as an error toast via this path — no special-casing needed for
either, matching how approve/reject/pending already handle their own 403s.

## Testing

No automated frontend test suite is configured in this repo (no
vitest/jest config, no existing `*.test.tsx` files for any of the sibling
dialogs this design mirrors). Verification is `tsc --noEmit` + lint +
manual QA in the dev server (delete from the list, delete from the detail
page, confirm the 403/404 error-toast paths if feasible to trigger
manually), consistent with how the rest of this vendor dashboard was
verified.

## Out of scope

- Any restore/undo action for a soft-deleted vendor (matches backend scope).
- Client-side permission gating of the delete button/dialog (backend's
  `can:vendors.destroy` middleware is the enforcement point, same as every
  other vendor action on this dashboard).
- Bulk/multi-select delete.
