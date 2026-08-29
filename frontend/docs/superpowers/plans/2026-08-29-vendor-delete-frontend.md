# Vendor Delete (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a delete-vendor button to both the vendor list table and the vendor detail page, wired to the already-implemented backend endpoint `DELETE /api/v1/vendors/{id}`.

**Architecture:** Add a `deleteVendor` API function and a `useDeleteVendor` mutation hook (mirroring the existing `approveVendor`/`useApproveVendor` pair), then build one reusable `DeleteVendorDialog` component (an `AlertDialog` that takes an external `trigger`/`triggerChildren`, matching this folder's existing `RejectReasonDialog`) and wire it into both the list table's row actions and the detail page's action-button row.

**Tech Stack:** Next.js 16, React 19, TypeScript 5 (strict), TanStack Query 5, axios, sonner (toast), shadcn/ui-style `AlertDialog` (base-ui). No test runner configured in this repo — verification is `npx tsc --noEmit`, `npm run lint`, and manual checks via `npm run dev`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-29-vendor-delete-frontend-design.md`. Backend spec (already implemented, no backend changes in this plan): `../backend/docs/superpowers/specs/2026-08-28-vendor-delete-and-purge-design.md`.
- No backend changes — `DELETE /api/v1/vendors/{id}` already exists, is merged, returns 204, guarded by `can:vendors.destroy` middleware.
- `DeleteVendorDialog`'s trigger contract: `trigger` is a *bare* element (no children of its own, e.g. `<Button variant="outline" className="..." />`), `triggerChildren` is rendered inside it by the dialog via `<AlertDialogTrigger render={trigger}>{triggerChildren}</AlertDialogTrigger>` — exactly how `reject-reason-dialog.tsx` and `delete-internal-profile-dialog.tsx` both already do it. Callers never wrap `trigger` in `AlertDialogTrigger` themselves.
- `DeleteVendorDialog` owns its own `useDeleteVendor()` mutation and its own `open` state, and closes itself (`setOpen(false)`) only inside the toast's `success` callback — it stays open with its confirm button disabled for the whole mutation (matches `delete-internal-profile-dialog.tsx`). Because of this, neither caller ever needs a `deleteVendor.isPending` ternary for `triggerChildren` — it's always a static icon/label.
- No client-side permission gating on the delete button — matches every other vendor action on this dashboard (approve/reject/pending have none either); the backend's `can:vendors.destroy` middleware is the enforcement point, a 403 surfaces as a toast error.
- No self-delete guard (unlike `DeleteInternalProfileDialog`) — a vendor account can never be the acting admin.
- Copy (exact strings): dialog title `ลบผู้ค้า`; description `` ต้องการลบผู้ค้า "{displayName}" ใช่หรือไม่? ``; confirm button `ลบผู้ค้า`; cancel button `ยกเลิก`; toast loading `กำลังลบผู้ค้า...`; toast success `ลบผู้ค้าสำเร็จ`; toast error fallback `ลบผู้ค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง`.
- Error handling: local `getErrorMessage(error)` helper in the dialog file (Axios error's `response.data.message` via `isAxiosError`, else the fallback above) — same duplicated-per-file shape as every other vendor dialog/hook in this codebase; do not extract a shared util (matches spec's explicit out-of-scope call).
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Baseline (captured before this plan): **2 pre-existing, unrelated errors** — `app/(auth)/register/page.tsx(129,118)` and `app/dashboard/internal-employees/departments-positions/page.tsx(18,40)`. Only confirm no *new* errors appear (none should mention `lib/vendor/` or `app/dashboard/vendors/`).
- Verify lint with `npm run lint` from `frontend/`. Baseline: **9 pre-existing errors / 8 warnings**, all in `components/legal/privacy-content.tsx`, `components/legal/terms-content.tsx`, `components/ui/sidebar.tsx`, `app/dashboard/users/roles-permissions/_components/role-tab.tsx`, `components/ui/data-table.tsx` — none in vendor files. Only confirm no *new* errors appear.
- File paths below are relative to `frontend/` (repo root is `d:\E-Procurement-System\`, this plan's cwd is `frontend/`).

---

### Task 1: Add `deleteVendor` API function

**Files:**
- Modify: `lib/vendor/approval/api.ts`

**Interfaces:**
- Produces (used by Task 2): `deleteVendor(id: number): Promise<void>` in `lib/vendor/approval/api.ts`.

- [ ] **Step 1: Add `deleteVendor` next to the other profile-level actions**

In `lib/vendor/approval/api.ts`, the current `pendingVendor` function (lines 87-89) is:

```ts
export async function pendingVendor(id: number): Promise<void> {
  await api.post(`/api/v1/vendors/${id}/pending`);
}
```

Replace it with:

```ts
export async function pendingVendor(id: number): Promise<void> {
  await api.post(`/api/v1/vendors/${id}/pending`);
}

export async function deleteVendor(id: number): Promise<void> {
  await api.delete(`/api/v1/vendors/${id}`);
}
```

(This inserts `deleteVendor` immediately after `pendingVendor`, before `approveVendorDocument` — grouped with the other vendor-profile-level actions, not the document-level ones.)

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 2 pre-existing errors as baseline (`app/(auth)/register/page.tsx`, `app/dashboard/internal-employees/departments-positions/page.tsx`), nothing new from `lib/vendor/`.

- [ ] **Step 3: Commit**

```bash
git add lib/vendor/approval/api.ts
git commit -m "feat(vendor): add deleteVendor API function"
```

---

### Task 2: Add `useDeleteVendor` mutation hook

**Files:**
- Create: `lib/vendor/approval/mutations/useDeleteVendor.ts`

**Interfaces:**
- Consumes: `deleteVendor(id: number): Promise<void>` from Task 1; `useInvalidateVendors()` (existing, in `lib/vendor/approval/mutations/useInvalidateVendors.ts`).
- Produces (used by Task 3): `useDeleteVendor()` — a TanStack `UseMutationResult` whose `mutateAsync` takes a `number` id and resolves `void`; exposes `.isPending`.

- [ ] **Step 1: Create the mutation hook**

Create `lib/vendor/approval/mutations/useDeleteVendor.ts` (mirrors `useApproveVendor.ts` exactly):

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

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 2 pre-existing errors as baseline, nothing new.

- [ ] **Step 3: Commit**

```bash
git add lib/vendor/approval/mutations/useDeleteVendor.ts
git commit -m "feat(vendor): add useDeleteVendor mutation hook"
```

---

### Task 3: Create `DeleteVendorDialog` and wire it into the vendor list table

**Files:**
- Create: `app/dashboard/vendors/_components/delete-vendor-dialog.tsx`
- Modify: `app/dashboard/vendors/_components/table/columns.tsx`

**Interfaces:**
- Consumes: `useDeleteVendor()` from Task 2.
- Produces (used by Task 4): `DeleteVendorDialog` — named export, props `{ vendorId: number; displayName: string; trigger: ReactElement; triggerChildren: ReactNode; onSuccess?: () => void }`.

- [ ] **Step 1: Create `DeleteVendorDialog`**

Create `app/dashboard/vendors/_components/delete-vendor-dialog.tsx`:

```tsx
"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteVendor } from "@/lib/vendor/approval/mutations/useDeleteVendor";

function getErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ลบผู้ค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function DeleteVendorDialog({
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
}) {
    const [open, setOpen] = useState(false);
    const deleteVendorMutation = useDeleteVendor();

    const handleDelete = () => {
        toast.promise(deleteVendorMutation.mutateAsync(vendorId), {
            loading: "กำลังลบผู้ค้า...",
            success: () => {
                setOpen(false);
                onSuccess?.();
                return "ลบผู้ค้าสำเร็จ";
            },
            error: getErrorMessage,
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger render={trigger}>{triggerChildren}</AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>ลบผู้ค้า</AlertDialogTitle>
                    <AlertDialogDescription>
                        ต้องการลบผู้ค้า &quot;{displayName}&quot; ใช่หรือไม่?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteVendorMutation.isPending}
                        className="bg-red-700 text-white hover:bg-red-600"
                        onClick={handleDelete}
                    >
                        ลบผู้ค้า
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
```

- [ ] **Step 2: Wire it into the list table's actions column**

In `app/dashboard/vendors/_components/table/columns.tsx`, the lucide-react import block (lines 6-14) is currently:

```ts
import {
    Building2,
    CircleCheck,
    CircleX,
    Clock,
    Eye,
    User,
    type LucideIcon,
} from "lucide-react"
```

Replace it with:

```ts
import {
    Building2,
    CircleCheck,
    CircleX,
    Clock,
    Eye,
    Trash2,
    User,
    type LucideIcon,
} from "lucide-react"
```

Then, immediately below that block, add the new import (there's no existing relative import in this file, but the sibling `app/dashboard/internal-employees/_components/table/columns.tsx` imports its delete dialog this exact way):

```ts
import { DeleteVendorDialog } from "../delete-vendor-dialog"
```

Finally, the `actions` column definition (currently the last entry in the `columns` array, lines 161-177) is:

```tsx
    {
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-center">
                <Button
                    variant="outline"
                    render={<Link href={routes.dashboards.vendors.detail(row.original.id)} />}
                    nativeButton={false}
                    className="size-8 px-1.5 pt-px rounded-md bg-white"
                >
                    <Eye className="w-4 h-4 text-gray-500" />
                </Button>
            </div>
        ),
    },
```

Replace it with:

```tsx
    {
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-center gap-1.5">
                <Button
                    variant="outline"
                    render={<Link href={routes.dashboards.vendors.detail(row.original.id)} />}
                    nativeButton={false}
                    className="size-8 px-1.5 pt-px rounded-md bg-white"
                >
                    <Eye className="w-4 h-4 text-gray-500" />
                </Button>

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
            </div>
        ),
    },
```

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 2 pre-existing errors as baseline, nothing new.

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same pre-existing baseline (9 errors / 8 warnings in the unrelated files listed in Global Constraints), nothing new from `app/dashboard/vendors/`.

- [ ] **Step 5: Manual verification**

Requires a running dev server (`npm run dev`) with the backend up and an authenticated internal/admin user session (one that has `vendors.destroy` permission — the seeded `admin` role has it).

1. Navigate to `/dashboard/vendors`.
2. Confirm each row now shows two icon buttons in the Actions column: the existing eye (view) icon, and a new red trash icon.
3. Click the trash icon on any vendor row. Confirm a dialog opens titled "ลบผู้ค้า" with the description `ต้องการลบผู้ค้า "{ชื่อผู้ค้า}" ใช่หรือไม่?` showing that row's actual vendor name.
4. Click "ยกเลิก" — confirm the dialog closes and the row is untouched.
5. Click the trash icon again, then click "ลบผู้ค้า" (confirm). Confirm a "กำลังลบผู้ค้า..." loading toast appears, then a "ลบผู้ค้าสำเร็จ" success toast, the dialog closes, and the row disappears from the table (and the status-tab counts above it update).

Report the actual outcome of this manual check (pass/fail per step) rather than assuming it passed — this codebase has no browser automation available, so this check must be run and its result disclosed, not skipped silently.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/vendors/_components/delete-vendor-dialog.tsx app/dashboard/vendors/_components/table/columns.tsx
git commit -m "feat(vendor): add delete button to vendor list table"
```

---

### Task 4: Wire `DeleteVendorDialog` into the vendor detail page

**Files:**
- Modify: `app/dashboard/vendors/detail/page.tsx`

**Interfaces:**
- Consumes: `DeleteVendorDialog` from Task 3; existing `routes.dashboards.vendors.index` (`lib/routes.ts`); existing `vendorId`, `displayName`, `isVendorActionPending` locals already computed in this file.

- [ ] **Step 1: Import `useRouter` and `DeleteVendorDialog`**

In `app/dashboard/vendors/detail/page.tsx`, the current import block (lines 1-16) is:

```tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { VendorDocumentApprovalRow } from "./_components/vendor-document-approval-row";
import { VendorProfileInfo } from "./_components/vendor-profile-info";
import { useVendorDetailPage } from "./_hooks/use-vendor-detail-page";
import { REQUIRED_DOCUMENTS } from "@/app/(public)/profiles/data/document-types";
import { routes } from "@/lib/routes";
import { cn, formatPhone, getInitials } from "@/lib/utils";
```

Replace it with:

```tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { DeleteVendorDialog } from "@/app/dashboard/vendors/_components/delete-vendor-dialog";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { VendorDocumentApprovalRow } from "./_components/vendor-document-approval-row";
import { VendorProfileInfo } from "./_components/vendor-profile-info";
import { useVendorDetailPage } from "./_hooks/use-vendor-detail-page";
import { REQUIRED_DOCUMENTS } from "@/app/(public)/profiles/data/document-types";
import { routes } from "@/lib/routes";
import { cn, formatPhone, getInitials } from "@/lib/utils";
```

- [ ] **Step 2: Add `const router = useRouter();`**

In the same file, `VendorDetailContent`'s current opening lines (26-28) are:

```tsx
function VendorDetailContent() {
  const searchParams = useSearchParams();
  const vendorId = Number(searchParams.get("id"));
```

Replace with:

```tsx
function VendorDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = Number(searchParams.get("id"));
```

- [ ] **Step 3: Add the delete button to the action-button row**

In the same file, the Action Buttons block (currently lines 103-106) opens with:

```tsx
        {/* Action Buttons */}
        <div className="flex items-center gap-2">

          {vendor.verificationStatus !== "pending" && (
```

Replace with:

```tsx
        {/* Action Buttons */}
        <div className="flex items-center gap-2">

          <DeleteVendorDialog
            vendorId={vendorId}
            displayName={displayName ?? ""}
            trigger={<Button type="button" variant="destructive" disabled={isVendorActionPending} />}
            triggerChildren="ลบผู้ค้า"
            onSuccess={() => router.push(routes.dashboards.vendors.index)}
          />

          {vendor.verificationStatus !== "pending" && (
```

(This places the delete button leftmost in the row, visually separated from the three status-transition buttons — รอตรวจสอบ / อนุมัติผู้ค้า / ปฏิเสธผู้ค้า — that follow it.)

- [ ] **Step 4: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 2 pre-existing errors as baseline, nothing new.

- [ ] **Step 5: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same pre-existing baseline, nothing new from `app/dashboard/vendors/`.

- [ ] **Step 6: Manual verification**

Requires the same running dev server + backend + authenticated admin session as Task 3.

1. Navigate to a vendor's detail page (`/dashboard/vendors/detail?id={id}`).
2. Confirm a red "ลบผู้ค้า" button now appears as the leftmost action button, next to รอตรวจสอบ/อนุมัติผู้ค้า/ปฏิเสธผู้ค้า.
3. Click it — confirm the same "ลบผู้ค้า" dialog opens, showing this vendor's actual name in the description.
4. Click "ยกเลิก" — confirm the dialog closes and the page is unchanged.
5. Click "ลบผู้ค้า" again, then confirm. Confirm the loading/success toasts appear (same copy as Task 3), and after success the page redirects to `/dashboard/vendors` with the just-deleted vendor no longer in the list.

Report the actual outcome of this manual check (pass/fail per step) rather than assuming it passed.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/vendors/detail/page.tsx
git commit -m "feat(vendor): add delete button to vendor detail page"
```
