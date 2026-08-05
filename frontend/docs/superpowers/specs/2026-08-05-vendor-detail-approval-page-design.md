# Vendor Detail Page — Profile + Document Approval

## Context

`/dashboard/vendors` (list) already exists and works: a `DataTable` with status filter, search, sorting, and an "Actions" column whose eye icon links to `routes.dashboards.vendors.detail(row.original.id)` (`app/dashboard/vendors/_components/table/columns.tsx:140`).

That link currently lands on `app/dashboard/vendors/detail/page.tsx`, a placeholder created this session that only reads `id` from the query string (`?id=`, not a `[id]` path segment — this project's `next.config.ts` has `output: "export"`, which cannot support a dynamic path segment for an ever-growing, runtime-created set of vendor IDs; see this session's earlier discussion) and echoes it back. This spec replaces that placeholder with the real approval UI.

A prior spec (`docs/superpowers/specs/2026-07-30-vendor-approval-dashboard-design.md`) designed a similar detail page, but the codebase has moved on since:

- Its proposed `lib/vendor-approval/` data layer already exists today, just relocated to **`lib/vendor/approval/`** (sibling of `lib/vendor/profile/`) — `types.ts`, `api.ts`, `mutations.ts`, `useVendorDetail.ts` are all present and match the old spec's contract almost exactly (list also gained pagination/counts/sort along the way, irrelevant here).
- `components/vendor-status-badge.tsx` (the shared `VendorStatusBadge`) already exists and is already used by both `document-row.tsx` and the vendor list's `columns.tsx`.
- The sidebar nav entry and `routes.dashboards.vendors.*` already exist (label is now "ผู้ค้าที่ลงทะเบียน", not the old spec's "อนุมัติผู้ขาย" — the list page evolved into a general vendor registry, not a pure approval inbox).
- `app/dashboard/vendors/_components/reject-reason-dialog.tsx` — proposed by the old spec — was **never built**. Still needed.
- Type import paths moved: `VendorProfile`/`VendorDocument`/`VendorContact` now live in `lib/vendor/profile/types.ts`; `getVendorDocumentViewUrl` now lives in `lib/vendor/profile/api.ts`.

**Backend status (checked this session):** only `GET /api/v1/vendors` (list) exists (`VendorApprovalController::index`, `routes/api/v1/dashboard/vendors.php`). There is no detail-fetch, approve, or reject endpoint on either the vendor or document level yet. Confirmed with user: build the frontend now anyway — every API call this page makes will 404/fail until a separate backend session implements the contract already defined in `lib/vendor/approval/api.ts`. This is disclosed, not a bug to fix here.

## Scope decisions (confirmed with user)

- **Build frontend now despite missing backend.** Same call as the 2026-07-30 spec — don't block UI work on backend availability.
- **Show the full vendor profile, not just an approval-focused summary.** Company/individual detail fields (address, tax ID, business type, registration numbers, etc.) and the full contact list, in addition to the approve/reject actions and documents.
- **Vendor-level approve/reject buttons are always visible**, regardless of the vendor's current `verificationStatus`. The frontend does not gate them by status — if there's a business rule about re-deciding an already-approved/rejected vendor, that's enforced server-side, not guessed here.
- **Contacts are read-only in this view.** No edit/delete/add — those stay vendor-self-service-only (existing `/profiles/contract` page). Since there are no action buttons to make room for, the contact row always shows its full detail line (phone/email/Line/other) rather than the self-service page's `hidden md:flex` + mobile-only `ViewContactDialog` pattern — that pattern exists there specifically to save space for the edit/delete buttons, which don't apply here.
- **Breadcrumb must reflect load state**, using the existing `loading` field on `useBreadcrumb`'s items (`lib/breadcrumb/store.ts`) rather than a static label.
- **Approval is two independent levels** (vendor vs. each document), same as the old spec — no auto-derivation either direction.
- **Rejection always requires a non-empty `remark`**; approval never does. Same as old spec.

## Part 1: `lib/vendor/approval/useVendorDetail.ts` (modify)

The query string can contain a missing/non-numeric `id` (bad link, manual URL edit). Add a guard so the hook doesn't fire a request for a nonsensical id, and so the view component has a clean signal to show "not found" immediately instead of waiting on a doomed network call:

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

With `enabled: false`, react-query reports `isPending: true` forever (by design — it's neither settled nor loading). The view component (Part 4) checks the id's validity itself before trusting `isPending`, so this doesn't leave the page stuck on a spinner.

## Part 2: `app/dashboard/vendors/_components/reject-reason-dialog.tsx` (new, shared)

Identical to the old spec's design — this part of that spec is still accurate, nothing about it has changed. Shared by both the vendor-level and document-level reject actions:

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

## Part 3: `app/dashboard/vendors/detail/page.tsx` (modify)

Replace the placeholder body with the real view, keeping the existing `Suspense`/`useSearchParams` shape (required because `useSearchParams` opts a component into client-only rendering, matching the pattern `use-vendor-list-page.ts` already established for this project's `output: "export"` build):

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

## Part 4: `app/dashboard/vendors/detail/_components/vendor-detail-view.tsx` (new)

Orchestrates the query, breadcrumb, header actions, and the three content sections. `vendorId` may be `NaN`/`0` (missing or non-numeric `?id=`) — treated as "not found" without ever calling the API:

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

## Part 5: `app/dashboard/vendors/detail/_components/vendor-profile-info.tsx` (new)

Read-only field grid, branching on `detail.type`. Mirrors the field set and grouping of `company-info-form.tsx` / `individual-info-form.tsx` (same fields, same order) but as plain text, not form inputs — this is a display, not an edit form:

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

## Part 6: `app/dashboard/vendors/detail/_components/vendor-contact-row.tsx` (new)

Same visual language as `contract/page.tsx`'s contact row (avatar initials, main-contact badge, `·`-separated detail line), minus the edit/delete/add actions and minus the `hidden md:flex` + mobile dialog fallback (no actions competing for space here, so the detail line always shows):

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

## Part 7: `app/dashboard/vendors/detail/_components/vendor-document-approval-row.tsx` (new)

Same visual shell as `document-row.tsx` (file-extension badge linking to the view URL, filename, status badge) with approve/reject actions instead of upload/delete. Reuses `getVendorDocumentViewUrl` from `lib/vendor/profile/api.ts` — confirmed by the 2026-07-30 spec's backend investigation that `viewVendorDocument` already permits any internal user to view any vendor's document, so no new view endpoint is needed:

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

## Error handling

- Invalid/missing `?id=` (not a positive finite number): treated as not-found immediately, no API call fires (`useVendorDetail`'s new `enabled` guard), breadcrumb shows "ไม่พบข้อมูล" instead of hanging on a skeleton.
- Loading: centered `Spinner`, same as every other query-driven page in this app (`contract/page.tsx`, `vendors/page.tsx`).
- Fetch error or empty response: "ไม่พบข้อมูลผู้ค้ารายนี้" — expected constantly right now since the backend has no detail endpoint yet.
- Every mutation (approve/reject, both levels): `toast.promise` + the same `getErrorMessage` shape already used by `delete-document-dialog.tsx` — parses `error.response.data.message` when present, generic Thai fallback otherwise.
- Reject dialogs cannot be confirmed with an empty/whitespace-only remark — enforced client-side via the disabled confirm button, matching this app's existing form-validation depth.
- `/dashboard/vendors/detail` needs no additional route guard — already covered by `InternalGuard` at `app/dashboard/layout.tsx`.

## Out of scope

- All backend work (`/api/v1/vendors/{id}`, `/approve`, `/reject`, document-level equivalents) — separate session, contract already defined in `lib/vendor/approval/api.ts`.
- Editing vendor info as an internal user — approve/reject only, never edits `detail`/`contact`.
- Contact add/edit/delete from this view — stays vendor-self-service-only.
- Internal users uploading/deleting vendor documents — view-only + approve/reject here.
- `VendorProfile::resubmit()` / `VendorDocument::reupload()` — vendor-side actions, not part of this internal-approver UI.
- Bulk approve/reject.
- Any notification (email/in-app) to the vendor on status change — backend concern.
- Restyling `app/dashboard/vendors/page.tsx` (the list) — untouched by this spec.

## Testing

No test runner configured in this repo. Verification is `npx tsc --noEmit` / `npm run lint` / `npm run build`, plus disclosed manual QA (no browser automation available in this environment — any runtime/visual claim is stated as unverified rather than asserted).

Once the backend contract exists, manual QA should cover:

1. `/dashboard/vendors` → click a row's eye icon → lands on `/dashboard/vendors/detail?id={id}`, breadcrumb shows "ผู้ค้าที่ลงทะเบียน" (linked) then the vendor's name.
2. Missing/garbage `?id=` (e.g. `?id=abc` or no `id` at all) → "ไม่พบข้อมูลผู้ค้ารายนี้" immediately, no network call, breadcrumb reads "ไม่พบข้อมูล".
3. Approve vendor → status badge updates; the list's filter for that status now includes this vendor.
4. Reject vendor → confirm button disabled with empty remark, enabled once text entered; rejecting updates the badge.
5. Same approve/reject checks at the document level, independent of the vendor's own status.
6. Company vs. individual vendor both render their correct field set in "ข้อมูลผู้ค้า".
7. Contact list sorted with the main contact first, full detail line visible at every viewport width (no dialog needed).
8. Non-internal user or logged-out visitor hitting the URL directly — redirected exactly like any other `/dashboard/*` page (existing `InternalGuard` behavior).
