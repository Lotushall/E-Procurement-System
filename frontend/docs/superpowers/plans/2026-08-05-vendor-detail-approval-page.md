# Vendor Detail Approval Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder `/dashboard/vendors/detail?id=` page with a real view showing a vendor's full profile, contacts, and documents, where an internal user can approve or reject the vendor and each document independently.

**Architecture:** Five small, focused components assembled into one orchestrating `VendorDetailView`, wired into the existing `page.tsx`. All data fetching/mutation hooks already exist in `lib/vendor/approval/` — this plan only adds UI and one small guard to an existing hook. A shared `RejectReasonDialog` backs both the vendor-level and document-level reject actions.

**Tech Stack:** Next.js 16 (App Router, `output: "export"`), React 19, TypeScript 5 (strict), `@base-ui/react` (this codebase's headless-UI base — **not** Radix), `@tanstack/react-query`, `sonner` (toast), `lucide-react` is not needed for this plan. No test runner configured in this repo — verification is `tsc --noEmit`, `eslint`, and manual checks where possible.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-05-vendor-detail-approval-page-design.md` — read it for full context/rationale behind every decision below.
- **Frontend only. No backend changes.** Every call through `lib/vendor/approval/api.ts` targets endpoints that don't exist yet except `GET /api/v1/vendors` (list). Do not attempt to implement, stub, or mock the backend; a 404/network failure from these endpoints is expected, not a bug in this plan's scope.
- **Approval is two independent levels.** Approving/rejecting a vendor never touches document statuses, and vice versa. No auto-derivation logic between them.
- **Rejection always requires a non-empty `remark`.** Both vendor-level and document-level reject dialogs keep their confirm button disabled until the textarea has non-whitespace content. Approval never requires a reason.
- **Vendor-level approve/reject buttons are always visible**, regardless of `verificationStatus`. Do not add frontend-side gating by current status.
- **Contacts are read-only in this view** — no add/edit/delete controls.
- File paths below are relative to `frontend/` (repo root `D:\E-Procurement-System`, `frontend/`/`backend/` are siblings). You are on git branch `Internal`.
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Baseline confirmed 2026-08-05: **6** pre-existing, unrelated errors, all `TS2345` in `lib/auth/permissions.ts` (lines 30, 35, 40, 45, 50, 55 — `CurrentUser` not assignable to `User`). Confirm no *new* errors after each task.
- Verify lint with `npm run lint` from `frontend/`. Baseline confirmed 2026-08-05: **8** pre-existing `react/no-unescaped-entities` errors (`components/legal/privacy-content.tsx` x2, `components/legal/terms-content.tsx` x6) plus **1** pre-existing warning (`app/dashboard/vendors/_components/table/data-table.tsx`, `react-hooks/incompatible-library`, from `useReactTable`). Confirm no *new* errors/warnings after each task.
- No browser automation is available in this environment. Any task step that requires visually confirming rendered output must be explicitly disclosed as unverified rather than asserted.
- Existing primitives already confirmed present and usable as-is (no new UI primitives needed): `Badge`, `Button` (supports `render={<Link .../>}`), `Dialog`/`DialogContent`/`DialogDescription`/`DialogFooter`/`DialogHeader`/`DialogTitle`/`DialogTrigger`, `Textarea`, `Spinner`, `VendorStatusBadge` (`components/vendor-status-badge.tsx`).
- Data layer already exists — do not duplicate it: `lib/vendor/approval/types.ts` (`VendorDetail`, `VendorVerificationStatus`), `lib/vendor/approval/api.ts` (`fetchVendorDetail`, `approveVendor`, `rejectVendor`, `approveVendorDocument`, `rejectVendorDocument`), `lib/vendor/approval/mutations.ts` (`useApproveVendor`, `useRejectVendor`, `useApproveVendorDocument`, `useRejectVendorDocument`), `lib/vendor/profile/types.ts` (`VendorProfile`, `VendorProfileDetail`, `VendorContact`, `VendorDocument`), `lib/vendor/profile/api.ts` (`getVendorDocumentViewUrl`).

---

### Task 1: Guard `useVendorDetail` against an invalid id

**Files:**
- Modify: `lib/vendor/approval/useVendorDetail.ts`

**Interfaces:**
- Produces (used by Task 5): `useVendorDetail(id: number)` — now also usable with a `NaN`/`0`/negative `id` without firing a request.
- Consumes: `useQuery` from `@tanstack/react-query` (existing), `fetchVendorDetail` from `@/lib/vendor/approval/api` (existing, unchanged).

- [ ] **Step 1: Read the current file to confirm its exact contents before editing**

Run: view `lib/vendor/approval/useVendorDetail.ts`. It currently reads:

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchVendorDetail } from "@/lib/vendor/approval/api";

export function useVendorDetail(id: number) {
  return useQuery({
    queryKey: ["vendors", "detail", id],
    queryFn: () => fetchVendorDetail(id),
  });
}
```

If it differs from this, stop and re-read the file in full before proceeding — do not blindly apply the diff below.

- [ ] **Step 2: Add the `enabled` guard**

Replace the file's contents with:

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchVendorDetail } from "@/lib/vendor/approval/api";

export function useVendorDetail(id: number) {
  return useQuery({
    queryKey: ["vendors", "detail", id],
    queryFn: () => fetchVendorDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
```

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 6 pre-existing baseline errors (all in `lib/auth/permissions.ts`), nothing new.

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing errors + 1 pre-existing warning, nothing new.

- [ ] **Step 5: Commit**

```bash
git add lib/vendor/approval/useVendorDetail.ts
git commit -m "fix(vendor-approval): skip vendor detail fetch for an invalid id"
```

---

### Task 2: Shared `RejectReasonDialog`

**Files:**
- Create: `app/dashboard/vendors/_components/reject-reason-dialog.tsx`

**Interfaces:**
- Produces (used by Task 4 and Task 5): `export function RejectReasonDialog(props: { trigger: ReactElement; triggerChildren: ReactNode; title: string; description: string; isPending: boolean; onConfirm: (remark: string) => void }): JSX.Element`.
- Consumes: `Dialog`/`DialogContent`/`DialogDescription`/`DialogFooter`/`DialogHeader`/`DialogTitle`/`DialogTrigger` from `@/components/ui/dialog` (existing), `Button` from `@/components/ui/button` (existing), `Textarea` from `@/components/ui/textarea` (existing).

- [ ] **Step 1: Create `app/dashboard/vendors/_components/reject-reason-dialog.tsx`**

```tsx
"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function RejectReasonDialog({
  trigger,
  triggerChildren,
  title,
  description,
  isPending,
  onConfirm,
}: {
  trigger: ReactElement;
  triggerChildren: ReactNode;
  title: string;
  description: string;
  isPending: boolean;
  onConfirm: (remark: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState("");

  const handleConfirm = () => {
    onConfirm(remark.trim());
    setOpen(false);
    setRemark("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerChildren}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="ระบุเหตุผลที่ปฏิเสธ"
          rows={3}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={!remark.trim() || isPending}
            onClick={handleConfirm}
          >
            ยืนยันปฏิเสธ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing errors + 1 pre-existing warning, nothing new.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/vendors/_components/reject-reason-dialog.tsx
git commit -m "feat(vendor-approval): add shared reject-reason dialog"
```

---

### Task 3: Read-only display components — profile info + contact row

**Files:**
- Create: `app/dashboard/vendors/detail/_components/vendor-profile-info.tsx`
- Create: `app/dashboard/vendors/detail/_components/vendor-contact-row.tsx`

**Interfaces:**
- Produces (used by Task 5): `export function VendorProfileInfo({ detail }: { detail: VendorProfileDetail }): JSX.Element`; `export function VendorContactRow({ contact }: { contact: VendorContact }): JSX.Element`.
- Consumes: `VendorProfileDetail`, `VendorContact` from `@/lib/vendor/profile/types` (existing), `Badge` from `@/components/ui/badge` (existing), `cn`/`formatPhone`/`getInitials` from `@/lib/utils` (existing — already used the same way in `app/(public)/profiles/contract/page.tsx`).

- [ ] **Step 1: Create `app/dashboard/vendors/detail/_components/vendor-profile-info.tsx`**

```tsx
import type { VendorProfileDetail } from "@/lib/vendor/profile/types";

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

export function VendorProfileInfo({ detail }: { detail: VendorProfileDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">ข้อมูลผู้ค้า</h2>
      <div className="grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-4">
        {detail.type === "company" ? (
          <>
            <InfoItem label="ชื่อบริษัท / นิติบุคคล" value={detail.companyName} />
            <InfoItem label="ประเภทธุรกิจ" value={detail.businessType} />
            <InfoItem label="สาขา" value={detail.branchNo} />
            <InfoItem label="เลขทะเบียนนิติบุคคล" value={detail.businessRegistrationNo} />
            <InfoItem label="เลขผู้เสียภาษี" value={detail.taxId} />
          </>
        ) : (
          <>
            <InfoItem label="ชื่อร้านค้า" value={detail.storeName} />
            <InfoItem label="คำนำหน้า" value={detail.prefix} />
            <InfoItem label="ชื่อ" value={detail.firstname} />
            <InfoItem label="นามสกุล" value={detail.lastname} />
            <InfoItem label="เลขบัตรประชาชน" value={detail.citizenId} />
            <InfoItem label="เลขผู้เสียภาษี" value={detail.taxId} />
            <InfoItem label="ประเภทธุรกิจ" value={detail.businessType} />
            <InfoItem label="อีเมล" value={detail.email} />
            <InfoItem label="เบอร์โทรศัพท์" value={detail.phone} />
          </>
        )}
        <InfoItem label="ที่อยู่" value={detail.address} />
        <InfoItem label="จังหวัด" value={detail.province} />
        <InfoItem label="รหัสไปรษณีย์" value={detail.postalCode} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/dashboard/vendors/detail/_components/vendor-contact-row.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import { cn, formatPhone, getInitials } from "@/lib/utils";
import type { VendorContact } from "@/lib/vendor/profile/types";

export function VendorContactRow({ contact }: { contact: VendorContact }) {
  return (
    <div className="flex items-center gap-3.5 rounded-md border p-4">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-md font-bold text-white",
          contact.isMainContact ? "bg-red-700" : "bg-gray-200 text-gray-500",
        )}
      >
        {getInitials(contact.contactName)}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-col-reverse gap-1 md:flex-row md:items-center md:gap-2.5">
          <p className="font-bold tracking-wide capitalize">{contact.contactName}</p>
          {contact.isMainContact && (
            <Badge className="bg-red-100 text-red-800 tracking-wider">ผู้ติดต่อหลัก</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 text-sm font-thin tracking-wide text-gray-600">
          <p className="capitalize">{contact.contactPosition || contact.contactName}</p>
          {contact.contactPhone && <p> · {formatPhone(contact.contactPhone)}</p>}
          {contact.contactEmail && <p className="break-all"> · {contact.contactEmail}</p>}
          {contact.lineId && <p> · {contact.lineId}</p>}
          {contact.otherContact && <p> · {contact.otherContact}</p>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing errors + 1 pre-existing warning, nothing new.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/vendors/detail/_components/vendor-profile-info.tsx app/dashboard/vendors/detail/_components/vendor-contact-row.tsx
git commit -m "feat(vendor-approval): add read-only vendor profile and contact display"
```

---

### Task 4: `VendorDocumentApprovalRow`

**Files:**
- Create: `app/dashboard/vendors/detail/_components/vendor-document-approval-row.tsx`

**Interfaces:**
- Produces (used by Task 5): `export function VendorDocumentApprovalRow({ vendorId, document }: { vendorId: number; document: VendorDocument }): JSX.Element`.
- Consumes: `RejectReasonDialog` (Task 2), `useApproveVendorDocument`/`useRejectVendorDocument` from `@/lib/vendor/approval/mutations` (existing), `getVendorDocumentViewUrl` from `@/lib/vendor/profile/api` (existing), `VendorDocument` from `@/lib/vendor/profile/types` (existing), `VendorStatusBadge` (existing).

- [ ] **Step 1: Create `app/dashboard/vendors/detail/_components/vendor-document-approval-row.tsx`**

```tsx
"use client";

import Link from "next/link";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { getVendorDocumentViewUrl } from "@/lib/vendor/profile/api";
import type { VendorDocument } from "@/lib/vendor/profile/types";
import {
  useApproveVendorDocument,
  useRejectVendorDocument,
} from "@/lib/vendor/approval/mutations";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function VendorDocumentApprovalRow({
  vendorId,
  document,
}: {
  vendorId: number;
  document: VendorDocument;
}) {
  const approveDoc = useApproveVendorDocument(vendorId);
  const rejectDoc = useRejectVendorDocument(vendorId);

  const handleApprove = () => {
    toast.promise(approveDoc.mutateAsync(document.id), {
      loading: "กำลังอนุมัติเอกสาร...",
      success: "อนุมัติเอกสารสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-md border p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          href={getVendorDocumentViewUrl(document.id)}
          target="_blank"
          rel="noopener"
          className="font-bold hover:underline"
        >
          {document.fileName}
        </Link>
        <VendorStatusBadge status={document.status} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" size="sm" onClick={handleApprove} disabled={approveDoc.isPending}>
          อนุมัติ
        </Button>
        <RejectReasonDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
            />
          }
          triggerChildren="ปฏิเสธ"
          title="ปฏิเสธเอกสาร"
          description={`ระบุเหตุผลที่ปฏิเสธเอกสาร "${document.fileName}"`}
          isPending={rejectDoc.isPending}
          onConfirm={(remark) =>
            toast.promise(rejectDoc.mutateAsync({ documentId: document.id, remark }), {
              loading: "กำลังปฏิเสธเอกสาร...",
              success: "ปฏิเสธเอกสารสำเร็จ",
              error: getErrorMessage,
            })
          }
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing errors + 1 pre-existing warning, nothing new.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/vendors/detail/_components/vendor-document-approval-row.tsx
git commit -m "feat(vendor-approval): add document approve/reject row"
```

---

### Task 5: `VendorDetailView` and wiring `page.tsx`

**Files:**
- Create: `app/dashboard/vendors/detail/_components/vendor-detail-view.tsx`
- Modify: `app/dashboard/vendors/detail/page.tsx`

**Interfaces:**
- Consumes: `useVendorDetail` (Task 1), `RejectReasonDialog` (Task 2), `VendorProfileInfo`/`VendorContactRow` (Task 3), `VendorDocumentApprovalRow` (Task 4), `useApproveVendor`/`useRejectVendor` from `@/lib/vendor/approval/mutations` (existing), `useBreadcrumb` from `@/lib/breadcrumb/useBreadcrumb` (existing), `routes` from `@/lib/routes` (existing), `VendorStatusBadge` (existing), `getInitials` from `@/lib/utils` (existing).
- Produces: `export function VendorDetailView({ vendorId }: { vendorId: number }): JSX.Element`, consumed only by `page.tsx` in this same task.

- [ ] **Step 1: Create `app/dashboard/vendors/detail/_components/vendor-detail-view.tsx`**

```tsx
"use client";

import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { useVendorDetail } from "@/lib/vendor/approval/useVendorDetail";
import { useApproveVendor, useRejectVendor } from "@/lib/vendor/approval/mutations";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { getInitials } from "@/lib/utils";
import { VendorProfileInfo } from "./vendor-profile-info";
import { VendorContactRow } from "./vendor-contact-row";
import { VendorDocumentApprovalRow } from "./vendor-document-approval-row";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function VendorDetailView({ vendorId }: { vendorId: number }) {
  const isValidId = Number.isFinite(vendorId) && vendorId > 0;
  const { data: vendor, isPending, isError } = useVendorDetail(vendorId);
  const approveVendor = useApproveVendor(vendorId);
  const rejectVendor = useRejectVendor(vendorId);

  const notFound = !isValidId || isError || (!isPending && !vendor);
  const displayName = vendor
    ? vendor.detail.type === "company"
      ? vendor.detail.companyName
      : vendor.detail.storeName
    : undefined;

  useBreadcrumb([
    { label: "ผู้ค้าที่ลงทะเบียน", href: routes.dashboards.vendors.index },
    isValidId && isPending ? { loading: true } : { label: displayName ?? "ไม่พบข้อมูล" },
  ]);

  if (isValidId && isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลผู้ค้ารายนี้
      </p>
    );
  }

  const handleApprove = () => {
    toast.promise(approveVendor.mutateAsync(undefined), {
      loading: "กำลังอนุมัติ...",
      success: "อนุมัติผู้ค้าสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-bold text-white">
            {getInitials(displayName ?? "")}
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{vendor.user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VendorStatusBadge status={vendor.verificationStatus} />
          <Button type="button" onClick={handleApprove} disabled={approveVendor.isPending}>
            อนุมัติผู้ค้า
          </Button>
          <RejectReasonDialog
            trigger={<Button type="button" variant="destructive" />}
            triggerChildren="ปฏิเสธผู้ค้า"
            title="ปฏิเสธผู้ค้า"
            description={`ระบุเหตุผลที่ปฏิเสธ "${displayName}"`}
            isPending={rejectVendor.isPending}
            onConfirm={(remark) =>
              toast.promise(rejectVendor.mutateAsync(remark), {
                loading: "กำลังปฏิเสธ...",
                success: "ปฏิเสธผู้ค้าสำเร็จ",
                error: getErrorMessage,
              })
            }
          />
        </div>
      </div>

      <VendorProfileInfo detail={vendor.detail} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">ผู้ติดต่อ</h2>
        {vendor.contact.length > 0 ? (
          <div className="flex flex-col gap-2">
            {[...vendor.contact]
              .sort((a, b) => (b.isMainContact ? 1 : 0) - (a.isMainContact ? 1 : 0))
              .map((contact) => (
                <VendorContactRow key={contact.id} contact={contact} />
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีผู้ติดต่อ</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">เอกสาร</h2>
        {vendor.document && vendor.document.length > 0 ? (
          <div className="flex flex-col gap-2">
            {vendor.document.map((doc) => (
              <VendorDocumentApprovalRow key={doc.id} vendorId={vendorId} document={doc} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีเอกสารที่อัปโหลด</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modify `app/dashboard/vendors/detail/page.tsx`**

Current contents (confirm the file still matches this before editing — it was written as a placeholder earlier in this project and must not have been changed elsewhere in the meantime):

```tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function VendorDetailPage() {
  return (
    <Suspense fallback={null}>
      <VendorDetailContent />
    </Suspense>
  );
}

function VendorDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  return (
    <div>
      VendorDetail: {id}
    </div>
  );
}
```

Replace with:

```tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VendorDetailView } from "./_components/vendor-detail-view";

export default function VendorDetailPage() {
  return (
    <Suspense fallback={null}>
      <VendorDetailContent />
    </Suspense>
  );
}

function VendorDetailContent() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));

  return <VendorDetailView vendorId={id} />;
}
```

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing errors + 1 pre-existing warning, nothing new.

- [ ] **Step 5: Build**

Run (from `frontend/`): `npm run build`
Expected: the compile phase succeeds and the new `/dashboard/vendors/detail` route is generated in the static export. The overall command may still exit non-zero solely from the pre-existing `lib/auth/permissions.ts` type errors during the build's type-check phase — that is a pre-existing condition on this branch (see Global Constraints), not a regression. Report the compile-phase result explicitly, and confirm no error mentions any file touched by this plan.

- [ ] **Step 6: Manual verification**

If `npm run dev` and browser access are available: click a row's eye icon on `/dashboard/vendors` (as an internal user) → confirm it lands on `/dashboard/vendors/detail?id={id}`, doesn't crash while the (failing, no-backend-detail-endpoint-yet) query resolves, shows "ไม่พบข้อมูลผู้ค้ารายนี้" instead of a blank page, and the breadcrumb reads "แดชบอร์ด / ผู้ค้าที่ลงทะเบียน / ไม่พบข้อมูล". Also check `/dashboard/vendors/detail` with no `?id=` and with `?id=abc` — both should show the same not-found state immediately, with no network request (visible in devtools' Network tab if available). If browser access is unavailable, disclose that explicitly rather than asserting these render correctly.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/vendors/detail/_components/vendor-detail-view.tsx app/dashboard/vendors/detail/page.tsx
git commit -m "feat(vendor-approval): assemble vendor detail page with profile, contacts, and documents"
```

---

## Self-Review Notes

- **Spec coverage:** Part 1 → Task 1. Part 2 → Task 2. Part 3 → Task 5 Step 2. Part 4 → Task 5 Step 1. Part 5 → Task 3 Step 1. Part 6 → Task 3 Step 2. Part 7 → Task 4. All seven spec parts map to a task.
- **Type consistency:** `VendorDetailView({ vendorId })`, `VendorProfileInfo({ detail })`, `VendorContactRow({ contact })`, `VendorDocumentApprovalRow({ vendorId, document })`, `RejectReasonDialog({ trigger, triggerChildren, title, description, isPending, onConfirm })` — names and shapes match between the task that produces each and the task(s) that consume it (Task 5 imports all four by these exact names).
- Task 1 must land before Task 5 (Task 5's `VendorDetailView` relies on the `enabled` guard to avoid a spinner-forever state on an invalid id) — reflected in task order above, but Tasks 2, 3, and 4 have no dependency on each other or on Task 1, so they may be done in any order relative to one another.
