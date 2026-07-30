# Vendor Approval Dashboard (Internal Users)

## Context

The internal dashboard (`app/dashboard/`) currently has one working page (`/dashboard`, placeholder welcome text) and one stub (`/dashboard/tor`, "Tor" text only). `AppSidebar` (`app/dashboard/_components/app-sidebar.tsx`) renders its nav from a `navItems` array and highlights the active item via `pathname === item.href` (exact match only, no prefix matching — no page needs it yet).

The backend already has the domain model for vendor verification, but nothing wires it up:

- `VendorProfile::approve(int $verifiedBy, ?string $remark)` / `::reject(...)` / `::resubmit()` — `backend/app/Modules/Vendor/Domain/Entities/VendorProfile.php:52-86`
- `VendorDocument::approve(...)` / `::reject(...)` / `::reupload(...)` — `backend/app/Modules/Vendor/Domain/Entities/VendorDocument.php:68-100`
- State value objects `Pending`/`Approved`/`Rejected` exist for both `VerificationStatus` and `DocumentStatus`.
- **None of these methods are called anywhere** — no controller, route, or use-case invokes them. `routes/api/v1/vendor.php` only has self-service routes (`GET vendor/profile`, `POST vendor/document`, etc.), all scoped to `$request->user()->id`. There is no "list vendors" query anywhere.
- One partial exception: `VendorController::viewVendorDocument()` already checks `user_type === UserType::Internal` to let an internal user view *any* vendor's document stream, bypassing the ownership check (`VendorController.php:147-151`). This endpoint is reused as-is by this feature — no new "view document" endpoint is needed.

`frontend/lib/vendor/types.ts` already has `VendorProfile` (with `verificationStatus`, `remark`, `detail`, `contact[]`, `document?[]`) and `VendorDocument` (with `status`, `verifiedBy`, `verifiedAt`, `remark`) shaped almost exactly like what an internal approver's detail view needs — this feature reuses those types rather than duplicating them.

**Scope of this spec: frontend only.** The backend has zero support for this feature today (dead-code entity methods, no routes, no list query). Building both sides in one plan was explicitly declined — this spec documents the API contract the frontend will call, for a separate backend session to implement against. Until that happens, the new pages compile and render but their API calls will fail (404/network error) — this is disclosed, not a bug to fix here.

## Scope decisions (confirmed with user)

- **Approval granularity: both levels, independent.** `VendorProfile` (overall vendor) and `VendorDocument` (each file) are approved/rejected separately, with no auto-derivation between them — approving all documents does not auto-approve the vendor, and vice versa. This matches the backend entities exactly (two separate methods, no linkage code anywhere).
- **Page structure: list + detail (2 pages).** `/dashboard/vendors` lists vendors; clicking one navigates to `/dashboard/vendors/[id]` for the full profile + documents + approve/reject actions. Not a single page with a side panel.
- **List scope: all statuses, tab-filtered.** The list shows vendors in every verification status, with tabs "รออนุมัติ" / "อนุมัติแล้ว" / "ปฏิเสธแล้ว" (default tab: รออนุมัติ) — not a pending-only queue.
- **Rejection requires a reason.** Both vendor-level and document-level rejection always require a non-empty `remark` before the reject action can be confirmed — there is no optional/skippable reason field. Approval never requires a reason.

## Part 1: `lib/routes.ts` (modify)

Add a `vendors` group under `dashboards`, alongside the existing `dashboard` and `tor` entries:

```ts
export const routes = {
  home: "/",
  profiles: {
    profile: "/profiles",
    vendorInfo: "/profiles/vendor-info",
    contract: "/profiles/contract",
    document: "/profiles/document",
  },
  auth: {
    login: "/login",
    forgotpassword: "/forgot-password",
    resetPassword: "/reset-password",
    register: "/register",
    verifyEmail: "/verify-email",
  },
  dashboards: {
    dashboard: "/dashboard",
    vendors: {
      index: "/dashboard/vendors",
      detail: (id: number | string) => `/dashboard/vendors/${id}`,
    },
    tor: {
      index: "/dashboard/tor",
    },
  },
  terms: "/terms",
  privacy: "/privacy",
} as const;
```

## Part 2: `app/dashboard/_components/app-sidebar.tsx` (modify)

Two changes only — add the new nav entry, and fix active-item matching so a detail page (`/dashboard/vendors/123`) still highlights the "อนุมัติผู้ขาย" item. Everything else in this file (styling, sizing, colors) was tuned directly by the user in the IDE and is untouched here:

```tsx
import { FileText, LayoutDashboard, UserCheck, type LucideIcon } from "lucide-react";
// ...

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const navItems: NavItem[] = [
  {
    href: routes.dashboards.dashboard,
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: routes.dashboards.vendors.index,
    label: "อนุมัติผู้ขาย",
    icon: UserCheck,
  },
  {
    href: routes.dashboards.tor.index,
    label: "การจัดการ TOR",
    icon: FileText,
  },
];
```

And in the render loop, replace the `isActive` expression only:

```tsx
{navItems.map((item) => {
  const isActive = item.exact
    ? pathname === item.href
    : pathname.startsWith(item.href);
  return (
    <SidebarMenuItem key={item.href} className="mx-2.5 my-0.5">
      <SidebarMenuButton
        render={<Link href={item.href} />}
        isActive={isActive}
        tooltip={item.label}
        className={/* unchanged from current file */}
      >
        <item.icon className="size-5!" />
        <span className="font-bold">{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
})}
```

`/dashboard` keeps exact matching (`exact: true`) so it doesn't stay highlighted while on `/dashboard/vendors`; the new `vendors` entry (and `tor`, for consistency) use prefix matching so their detail/sub-pages still highlight the parent nav item.

## Part 3: `components/vendor-status-badge.tsx` (new) + `document-row.tsx` refactor

`document-row.tsx` currently hardcodes a `STATUS_STYLE` map (pending/approved/rejected → label, badge classes, dot color) used only there. This feature needs the identical mapping for both vendor-level and document-level badges, so it moves out to a shared component instead of being copied a second time:

```tsx
// components/vendor-status-badge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  approved: { label: "อนุมัติแล้ว", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  rejected: { label: "ถูกปฏิเสธ", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
};

export function VendorStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLE[status];
  if (!style) return null;

  return (
    <Badge className={cn("tracking-wider", style.badge, className)}>
      <span className={cn("w-1.75 h-1.75 rounded-full", style.dot)} />
      {style.label}
    </Badge>
  );
}
```

In `document-row.tsx`: delete the local `STATUS_STYLE` const, import `VendorStatusBadge`, and replace the status lookup + inline `Badge` JSX:

```tsx
// before
const status = selectedFile ? STATUS_STYLE.pending : (existingDocument && STATUS_STYLE[existingDocument.status]);
// ...
{status && (
  <Badge className={cn("tracking-wider", status.badge)}>
    <span className={cn("w-1.75 h-1.75 rounded-full", status.dot)} />
    {status.label}
  </Badge>
)}

// after
const statusValue = selectedFile ? "pending" : existingDocument?.status;
// ...
{statusValue && <VendorStatusBadge status={statusValue} />}
```

## Part 4: `lib/vendor-approval/` data layer (new)

Reuses `VendorProfile`/`VendorVerificationStatus` from `lib/vendor/types.ts` rather than duplicating them.

**`lib/vendor-approval/types.ts`:**

```ts
import type { VendorProfile, VendorVerificationStatus } from "@/lib/vendor/types";
import type { User } from "@/lib/user/types";

export type { VendorVerificationStatus };

export interface VendorSummary {
  id: number;
  displayName: string;
  vendorType: "company" | "individual";
  verificationStatus: VendorVerificationStatus;
  submittedAt: string;
}

export interface VendorDetail extends VendorProfile {
  user: Pick<User, "username" | "email">;
}
```

**`lib/vendor-approval/api.ts`** — proposed contract (backend does not implement this yet):

```ts
import { api } from "@/lib/api";
import type {
  VendorDetail,
  VendorSummary,
  VendorVerificationStatus,
} from "@/lib/vendor-approval/types";

export async function fetchVendorList(
  status: VendorVerificationStatus,
): Promise<VendorSummary[]> {
  const { data } = await api.get<{ data: VendorSummary[] }>("/api/v1/vendors", {
    params: { status },
  });
  return data.data;
}

export async function fetchVendorDetail(id: number): Promise<VendorDetail> {
  const { data } = await api.get<{ data: VendorDetail }>(`/api/v1/vendors/${id}`);
  return data.data;
}

export async function approveVendor(id: number, remark?: string): Promise<void> {
  await api.post(`/api/v1/vendors/${id}/approve`, { remark });
}

export async function rejectVendor(id: number, remark: string): Promise<void> {
  await api.post(`/api/v1/vendors/${id}/reject`, { remark });
}

export async function approveVendorDocument(
  vendorId: number,
  documentId: number,
): Promise<void> {
  await api.post(`/api/v1/vendors/${vendorId}/documents/${documentId}/approve`);
}

export async function rejectVendorDocument(
  vendorId: number,
  documentId: number,
  remark: string,
): Promise<void> {
  await api.post(`/api/v1/vendors/${vendorId}/documents/${documentId}/reject`, { remark });
}
```

Note the `/api/v1/vendors` (plural) prefix — deliberately distinct from the existing self-service `/api/v1/vendor` (singular), which is always scoped to the calling user's own profile. This is a collection/admin-facing namespace and needs its own route file (`routes/api/v1/vendors.php`) and internal-only access control on the backend side — not designed here, but the naming is chosen so the two don't collide.

**`lib/vendor-approval/useVendorList.ts`:**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchVendorList } from "@/lib/vendor-approval/api";
import type { VendorVerificationStatus } from "@/lib/vendor-approval/types";

export function useVendorList(status: VendorVerificationStatus) {
  return useQuery({
    queryKey: ["vendors", status],
    queryFn: () => fetchVendorList(status),
  });
}
```

**`lib/vendor-approval/useVendorDetail.ts`:**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchVendorDetail } from "@/lib/vendor-approval/api";

export function useVendorDetail(id: number) {
  return useQuery({
    queryKey: ["vendors", "detail", id],
    queryFn: () => fetchVendorDetail(id),
  });
}
```

**`lib/vendor-approval/mutations.ts`** — a single `invalidateQueries({ queryKey: ["vendors"] })` is enough after every mutation: react-query matches by key prefix, so it covers every list tab (`["vendors", status]`) and every detail query (`["vendors", "detail", id]`) in one call:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveVendor,
  approveVendorDocument,
  rejectVendor,
  rejectVendorDocument,
} from "@/lib/vendor-approval/api";

function useInvalidateVendors() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["vendors"] });
}

export function useApproveVendor(id: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (remark?: string) => approveVendor(id, remark),
    onSettled: invalidate,
  });
}

export function useRejectVendor(id: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (remark: string) => rejectVendor(id, remark),
    onSettled: invalidate,
  });
}

export function useApproveVendorDocument(vendorId: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (documentId: number) => approveVendorDocument(vendorId, documentId),
    onSettled: invalidate,
  });
}

export function useRejectVendorDocument(vendorId: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: ({ documentId, remark }: { documentId: number; remark: string }) =>
      rejectVendorDocument(vendorId, documentId, remark),
    onSettled: invalidate,
  });
}
```

## Part 5: `app/dashboard/vendors/_components/reject-reason-dialog.tsx` (new, shared)

Used by both the vendor-level and document-level reject actions. Follows the same `Dialog` + trigger-as-render-prop shape as the existing `delete-document-dialog.tsx` (`AlertDialogTrigger render={<Button .../>}`). The confirm button stays disabled until the remark is non-empty after trimming:

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

## Part 6: List page — `app/dashboard/vendors/`

**`page.tsx`:**

```tsx
"use client";

import { VendorApprovalList } from "./_components/vendor-approval-list";

export default function VendorApprovalPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">อนุมัติผู้ขาย</h1>
      <VendorApprovalList />
    </div>
  );
}
```

**`_components/vendor-approval-list.tsx`:**

```tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useVendorList } from "@/lib/vendor-approval/useVendorList";
import type { VendorVerificationStatus } from "@/lib/vendor-approval/types";
import { VendorRow } from "./vendor-row";

const TABS: { value: VendorVerificationStatus; label: string }[] = [
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ปฏิเสธแล้ว" },
];

export function VendorApprovalList() {
  const [status, setStatus] = useState<VendorVerificationStatus>("pending");
  const { data: vendors, isPending } = useVendorList(status);

  return (
    <Tabs
      value={status}
      onValueChange={(value) => setStatus(value as VendorVerificationStatus)}
    >
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={status}>
        {isPending ? (
          <div className="flex justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : vendors && vendors.length > 0 ? (
          <div className="flex flex-col gap-2">
            {vendors.map((vendor) => (
              <VendorRow key={vendor.id} vendor={vendor} />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ไม่มีรายการในสถานะนี้
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
```

One `TabsContent`, keyed by the current `status` state, not three — there's only ever one active query result (`useVendorList(status)`), so rendering three parallel panels with the same data would be redundant.

**`_components/vendor-row.tsx`:**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { routes } from "@/lib/routes";
import type { VendorSummary } from "@/lib/vendor-approval/types";

const VENDOR_TYPE_LABEL: Record<VendorSummary["vendorType"], string> = {
  company: "นิติบุคคล",
  individual: "บุคคลธรรมดา",
};

export function VendorRow({ vendor }: { vendor: VendorSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-bold">{vendor.displayName}</p>
        <p className="text-xs text-muted-foreground">
          {VENDOR_TYPE_LABEL[vendor.vendorType]} · สมัครเมื่อ{" "}
          {new Date(vendor.submittedAt).toLocaleDateString("th-TH")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <VendorStatusBadge status={vendor.verificationStatus} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          render={<Link href={routes.dashboards.vendors.detail(vendor.id)} />}
        >
          ดูรายละเอียด
        </Button>
      </div>
    </div>
  );
}
```

## Part 7: Detail page — `app/dashboard/vendors/[id]/`

Confirmed against this project's Next.js docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`): in a Client Component page, `params` is a `Promise` unwrapped via React's `use()`.

**`page.tsx`:**

```tsx
"use client";

import { use } from "react";
import { VendorDetailView } from "./_components/vendor-detail-view";

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <VendorDetailView vendorId={Number(id)} />;
}
```

**`_components/vendor-detail-view.tsx`:**

```tsx
"use client";

import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { useVendorDetail } from "@/lib/vendor-approval/useVendorDetail";
import { useApproveVendor, useRejectVendor } from "@/lib/vendor-approval/mutations";
import { VendorDocumentApprovalRow } from "./vendor-document-approval-row";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function VendorDetailView({ vendorId }: { vendorId: number }) {
  const { data: vendor, isPending, isError } = useVendorDetail(vendorId);
  const approveVendor = useApproveVendor(vendorId);
  const rejectVendor = useRejectVendor(vendorId);

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลผู้ขายรายนี้
      </p>
    );
  }

  const displayName =
    vendor.detail.type === "company" ? vendor.detail.companyName : vendor.detail.storeName;

  const handleApprove = () => {
    toast.promise(approveVendor.mutateAsync(undefined), {
      loading: "กำลังอนุมัติ...",
      success: "อนุมัติผู้ขายสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{vendor.user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <VendorStatusBadge status={vendor.verificationStatus} />
          <Button type="button" onClick={handleApprove} disabled={approveVendor.isPending}>
            อนุมัติผู้ขาย
          </Button>
          <RejectReasonDialog
            trigger={<Button type="button" variant="destructive" />}
            triggerChildren="ปฏิเสธผู้ขาย"
            title="ปฏิเสธผู้ขาย"
            description={`ระบุเหตุผลที่ปฏิเสธ "${displayName}"`}
            isPending={rejectVendor.isPending}
            onConfirm={(remark) =>
              toast.promise(rejectVendor.mutateAsync(remark), {
                loading: "กำลังปฏิเสธ...",
                success: "ปฏิเสธผู้ขายสำเร็จ",
                error: getErrorMessage,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">เอกสาร</h2>
        {vendor.document && vendor.document.length > 0 ? (
          vendor.document.map((doc) => (
            <VendorDocumentApprovalRow key={doc.id} vendorId={vendorId} document={doc} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีเอกสารที่อัปโหลด</p>
        )}
      </div>
    </div>
  );
}
```

**`_components/vendor-document-approval-row.tsx`:**

```tsx
"use client";

import Link from "next/link";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { getVendorDocumentViewUrl } from "@/lib/vendor/api";
import type { VendorDocument } from "@/lib/vendor/types";
import {
  useApproveVendorDocument,
  useRejectVendorDocument,
} from "@/lib/vendor-approval/mutations";

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
    <div className="flex items-center justify-between gap-3 rounded-md border p-4">
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

- Every mutation (approve/reject, both levels) uses `toast.promise` + the same `getErrorMessage` shape already used by `delete-document-dialog.tsx` — parses `error.response.data.message` when present, falls back to a generic Thai message otherwise.
- List query: loading → `Spinner`; empty result for the active tab → "ไม่มีรายการในสถานะนี้"; the query itself has no special error UI beyond react-query's default (out of scope — no page in this app has bespoke list-fetch-error UI today).
- Detail query: loading → `Spinner`; `isError` or missing data (e.g. bad/deleted id) → "ไม่พบข้อมูลผู้ขายรายนี้", no crash.
- Reject dialogs cannot be confirmed with an empty/whitespace-only remark — button stays `disabled`, enforced client-side only (matches this app's existing form-validation depth; no separate double-check needed since the backend contract also requires `remark` server-side per Scope decisions).
- `/dashboard/vendors*` needs no additional guard — it's already covered by `InternalGuard` at `app/dashboard/layout.tsx`, same as every other page under `/dashboard`.

## Out of scope

- **All backend work**: the `/api/v1/vendors...` routes, controller, use-cases, and the "list vendors" query — this spec only documents the contract the frontend expects. A separate session/plan implements it.
- Pagination on the vendor list (contract has no `page` param; if the backend needs it later, that's a contract change, not covered here).
- Bulk approve/reject (select multiple vendors or documents at once).
- Search/sort/filter beyond the three status tabs.
- Any notification (email/in-app) to the vendor when their profile or a document is approved/rejected — a backend concern, not designed here.
- Editing vendor info as an internal user — this view is approve/reject only, never edits `detail`/`contact`.
- Internal users uploading/deleting documents — upload stays vendor-only via the existing self-service flow; internal users only view (existing `viewVendorDocument` endpoint) and approve/reject.
- `VendorProfile::resubmit()` / `VendorDocument::reupload()` — those are vendor-side actions (responding to a rejection), not part of this internal-approver UI.

## Testing

No test runner is configured in this repo. Verification is `npx tsc --noEmit` / `npm run lint` / `npm run build`, plus disclosed manual QA — this environment has no browser automation available, so any runtime/visual claim will be stated as unverified rather than asserted.

Once the backend contract exists, manual QA should cover:

1. `/dashboard/vendors` as an internal user — three tabs, default "รออนุมัติ", switching tabs refetches and shows the right vendors.
2. Empty tab (e.g. no rejected vendors yet) shows "ไม่มีรายการในสถานะนี้", not a blank area or crash.
3. "ดูรายละเอียด" navigates to `/dashboard/vendors/[id]`; sidebar's "อนุมัติผู้ขาย" item stays highlighted on the detail page (prefix-match check from Part 2).
4. On the detail page: approve vendor → status badge updates, list's "อนุมัติแล้ว" tab now includes this vendor.
5. Reject vendor: confirm button stays disabled with empty remark, enables once text is entered, rejecting updates the badge and moves the vendor to "ปฏิเสธแล้ว" in the list.
6. Same approve/reject checks at the document level, independent of the vendor's own status (approving one document doesn't change the vendor's own badge).
7. Non-internal user or logged-out visitor hitting `/dashboard/vendors` directly by URL — redirected exactly like any other `/dashboard/*` page today (existing `InternalGuard` behavior, not new).
