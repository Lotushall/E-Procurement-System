# Vendor Approval Dashboard (Internal Users) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give internal users a `/dashboard/vendors` list page (tab-filtered by verification status) and a `/dashboard/vendors/[id]` detail page where they can approve or reject a vendor's overall profile and each of its documents independently, with rejection always requiring a typed reason.

**Architecture:** A new `lib/vendor-approval/` data layer (types, API functions, react-query hooks, mutations) calls a backend contract that does not exist yet (documented in the spec, built separately) but is reused where possible — `lib/vendor/types.ts`'s `VendorProfile`/`VendorDocument`/`VendorVerificationStatus`, and the existing `getVendorDocumentViewUrl` (already internal-user-aware server-side). A shared `VendorStatusBadge` (extracted from `document-row.tsx`'s inline status map) and a shared `RejectReasonDialog` back both the list page and the detail page. `AppSidebar` gets one new nav entry, plus a fix so prefix-matched routes (list + its detail children) stay highlighted together.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 (strict), `@base-ui/react` (this codebase's actual headless-UI base — **not** Radix), `@tanstack/react-query`, `sonner` (toast), `lucide-react`. No test runner configured in this repo — verification is `tsc --noEmit`, `eslint`, `next build`, and manual checks via `npm run dev` where possible.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-30-vendor-approval-dashboard-design.md` — read it for the full context/rationale behind every decision below.
- **Frontend only. No backend changes.** Every new API call in `lib/vendor-approval/api.ts` targets endpoints that do not exist yet (`/api/v1/vendors...`). This is expected — do not attempt to implement, stub, or mock the backend, and do not treat a 404/network failure from these endpoints as a bug in this plan's scope.
- **Approval is two independent levels.** Approving/rejecting a `VendorProfile` never touches document statuses, and vice versa. Do not add any auto-derivation logic between them.
- **Rejection always requires a non-empty `remark`.** Both vendor-level and document-level reject dialogs must keep their confirm button disabled until the textarea has non-whitespace content. Approval never requires a reason.
- File paths below are relative to `frontend/` (repo root `D:\E-Procurement-System`, `frontend/`/`backend/` are siblings). You are on git branch `Internal`.
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Baseline confirmed 2026-07-30: **8** pre-existing, unrelated errors (2x `app/(auth)/reset-password/_components/reset-password-view.tsx` `TS2339`, 6x `lib/auth/permissions.ts` `TS2345`). Confirm no *new* errors after each task.
- Verify lint with `npm run lint` from `frontend/`. Baseline confirmed 2026-07-30: **8** pre-existing `react/no-unescaped-entities` errors (`components/legal/privacy-content.tsx` x2, `components/legal/terms-content.tsx` x6). Confirm no *new* errors after each task.
- `app/dashboard/_components/app-sidebar.tsx`'s existing styling (colors, sizing, rounding on `SidebarMenuButton`) was hand-tuned directly by the user in their IDE — Task 1 touches only the `navItems` array and the `isActive` calculation in this file, nothing else.
- No browser automation is available in this environment. Any task step that requires visually confirming rendered output must be explicitly disclosed as unverified rather than asserted — this matches how this branch's earlier dashboard work was verified.
- Existing primitives already confirmed present and usable as-is (no new UI primitives needed): `Badge`, `Button` (supports `render={<Link .../>}`, confirmed in `components/navbar.tsx:70`), `Dialog`/`DialogContent`/`DialogDescription`/`DialogFooter`/`DialogHeader`/`DialogTitle`/`DialogTrigger`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `Textarea`, `Spinner`, all of `components/ui/sidebar.tsx`'s exports.

---

### Task 1: Routes + `AppSidebar` nav entry

**Files:**
- Modify: `lib/routes.ts`
- Modify: `app/dashboard/_components/app-sidebar.tsx`

**Interfaces:**
- Produces (used by Tasks 5, 6): `routes.dashboards.vendors.index: string`, `routes.dashboards.vendors.detail(id: number | string): string`.
- Consumes: nothing new — both files already exist.

- [ ] **Step 1: Modify `lib/routes.ts`** — add a `vendors` group under `dashboards`, alongside the existing `dashboard` and `tor` entries:

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

- [ ] **Step 2: Modify `app/dashboard/_components/app-sidebar.tsx`** — add `UserCheck` to the `lucide-react` import, add an `exact?: boolean` field to `NavItem`, add the new nav entry, and mark `exact: true` on the existing dashboard entry:

```tsx
import { FileText, LayoutDashboard, UserCheck, type LucideIcon } from "lucide-react";
```

```tsx
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

Then, inside the `navItems.map(...)` in the render body, compute `isActive` per item instead of inlining `pathname === item.href` on the `SidebarMenuButton`. Everything else in the returned JSX (all `className` props, the icon size, `tooltip`, etc.) stays byte-for-byte as it is today — only the active-check changes:

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
        className={cn(
          "px-3.5 py-3 h-11",
          "data-active:border-l-[3px] data-active:border-red-700 data-active:bg-red-600/10 data-active:text-red-700 dark:data-active:bg-red-600/20",
          "data-active:hover:bg-red-600/10 data-active:hover:text-red-700",
          "hover:bg-transparent"
        )}
      >
        <item.icon className="size-5!" />
        <span className="font-bold">{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
})}
```

If the file's `className` string on `SidebarMenuButton` differs from what's shown above by the time you open it (it was last tuned directly by the user and may have changed again), **keep whatever `className` is already there verbatim** — only replace the `isActive={pathname === item.href}` line with the `isActive` variable computed above, and only add the new nav item entry from Step 2's `navItems` array. Do not revert or "clean up" any existing styling in this file.

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 5: Commit**

```bash
git add "lib/routes.ts" "app/dashboard/_components/app-sidebar.tsx"
git commit -m "feat(dashboard): add vendor-approval route and sidebar nav entry"
```

---

### Task 2: Shared `VendorStatusBadge` + `document-row.tsx` refactor

**Files:**
- Create: `components/vendor-status-badge.tsx`
- Modify: `app/(public)/profiles/document/_components/document-row.tsx`

**Interfaces:**
- Produces (used by Tasks 5, 6): `export function VendorStatusBadge({ status, className }: { status: string; className?: string }): JSX.Element | null` — renders `null` for an unrecognized status string instead of throwing, so callers don't need to pre-validate.
- Consumes: `Badge` from `@/components/ui/badge` (existing), `cn` from `@/lib/utils` (existing).

- [ ] **Step 1: Create `components/vendor-status-badge.tsx`**

```tsx
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

- [ ] **Step 2: Modify `app/(public)/profiles/document/_components/document-row.tsx`**

Delete this block near the top of the file (the local, now-duplicated status map):

```tsx
const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  approved: { label: "อนุมัติแล้ว", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  rejected: { label: "ถูกปฏิเสธ", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
};
```

Add an import for the new shared component:

```tsx
import { VendorStatusBadge } from "@/components/vendor-status-badge";
```

Replace the status-lookup line inside `DocumentRow`:

```tsx
// before
const status = selectedFile ? STATUS_STYLE.pending : (existingDocument && STATUS_STYLE[existingDocument.status]);

// after
const statusValue = selectedFile ? "pending" : existingDocument?.status;
```

Replace the inline `Badge` JSX block that renders the status:

```tsx
// before
{status && (
  <Badge className={cn("tracking-wider", status.badge)}>
    <span className={cn("w-1.75 h-1.75 rounded-full", status.dot)} />
    {status.label}
  </Badge>
)}

// after
{statusValue && <VendorStatusBadge status={statusValue} />}
```

Every other line in `document-row.tsx` (the required-dot badge, the upload/cancel buttons, the file-size formatting, etc.) is unchanged. If `Badge` is no longer used anywhere else in this file after this edit, remove its now-unused import — check before removing, since the "ไม่บังคับ" badge a few lines below also renders a `<Badge>` directly and still needs the import.

- [ ] **Step 3: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 5: Commit**

```bash
git add "components/vendor-status-badge.tsx" "app/(public)/profiles/document/_components/document-row.tsx"
git commit -m "refactor(vendor): extract shared VendorStatusBadge from document-row"
```

---

### Task 3: `lib/vendor-approval/` data layer

**Files:**
- Create: `lib/vendor-approval/types.ts`
- Create: `lib/vendor-approval/api.ts`
- Create: `lib/vendor-approval/useVendorList.ts`
- Create: `lib/vendor-approval/useVendorDetail.ts`
- Create: `lib/vendor-approval/mutations.ts`

**Interfaces:**
- Produces (used by Tasks 5, 6): `VendorSummary`, `VendorDetail`, `VendorVerificationStatus` types; `useVendorList(status: VendorVerificationStatus)`, `useVendorDetail(id: number)`; `useApproveVendor(id: number)` (mutate with `remark?: string`), `useRejectVendor(id: number)` (mutate with `remark: string`), `useApproveVendorDocument(vendorId: number)` (mutate with `documentId: number`), `useRejectVendorDocument(vendorId: number)` (mutate with `{ documentId: number; remark: string }`).
- Consumes: `VendorProfile`, `VendorVerificationStatus` from `@/lib/vendor/types` (existing), `User` from `@/lib/user/types` (existing), `api` from `@/lib/api` (existing axios instance, same one `lib/vendor/api.ts` uses).

- [ ] **Step 1: Create `lib/vendor-approval/types.ts`**

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

- [ ] **Step 2: Create `lib/vendor-approval/api.ts`**

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

- [ ] **Step 3: Create `lib/vendor-approval/useVendorList.ts`**

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

- [ ] **Step 4: Create `lib/vendor-approval/useVendorDetail.ts`**

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

- [ ] **Step 5: Create `lib/vendor-approval/mutations.ts`**

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

A single `["vendors"]` key prefix invalidation in every mutation is deliberate — react-query matches by key prefix, so it covers every list tab (`["vendors", status]`) and every detail query (`["vendors", "detail", id]`) in one call. Do not add more granular invalidation.

- [ ] **Step 6: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 7: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 8: Commit**

```bash
git add "lib/vendor-approval/"
git commit -m "feat(vendor-approval): add data layer for vendor list, detail, and approve/reject mutations"
```

---

### Task 4: Shared `RejectReasonDialog`

**Files:**
- Create: `app/dashboard/vendors/_components/reject-reason-dialog.tsx`

**Interfaces:**
- Produces (used by Task 6): `export function RejectReasonDialog(props: { trigger: ReactElement; triggerChildren: ReactNode; title: string; description: string; isPending: boolean; onConfirm: (remark: string) => void }): JSX.Element`.
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
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/vendors/_components/reject-reason-dialog.tsx"
git commit -m "feat(vendor-approval): add shared reject-reason dialog"
```

---

### Task 5: List page — `app/dashboard/vendors/`

**Files:**
- Create: `app/dashboard/vendors/page.tsx`
- Create: `app/dashboard/vendors/_components/vendor-approval-list.tsx`
- Create: `app/dashboard/vendors/_components/vendor-row.tsx`

**Interfaces:**
- Consumes: `routes.dashboards.vendors.detail` (Task 1), `VendorStatusBadge` (Task 2), `useVendorList`, `VendorSummary`, `VendorVerificationStatus` (Task 3), `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` (existing), `Spinner` (existing), `Button` (existing).

- [ ] **Step 1: Create `app/dashboard/vendors/page.tsx`**

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

- [ ] **Step 2: Create `app/dashboard/vendors/_components/vendor-approval-list.tsx`**

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

One `TabsContent`, keyed by the current `status` state — not one per tab — since there's only ever one active query result at a time.

- [ ] **Step 3: Create `app/dashboard/vendors/_components/vendor-row.tsx`**

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

- [ ] **Step 4: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 5: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 6: Build**

Run (from `frontend/`): `npm run build`
Expected: the compile phase succeeds for the new `/dashboard/vendors` route. The overall command may still exit non-zero solely from the pre-existing `reset-password-view.tsx` type error during the build's type-check phase — that's a pre-existing condition on this branch, not a regression. Report the compile-phase result explicitly.

- [ ] **Step 7: Manual verification**

If `npm run dev` and browser access are available, note that every API call here will fail (no backend yet, per Global Constraints) — verify only what doesn't require a successful response: `/dashboard/vendors` renders for an internal user, the three tabs are present and switchable, and the page doesn't crash while the query is pending/erroring (loading spinner or empty/error state shows instead of a blank screen). If browser access is unavailable, disclose that explicitly rather than asserting these render correctly.

- [ ] **Step 8: Commit**

```bash
git add "app/dashboard/vendors/page.tsx" "app/dashboard/vendors/_components/vendor-approval-list.tsx" "app/dashboard/vendors/_components/vendor-row.tsx"
git commit -m "feat(vendor-approval): add vendor list page with status tabs"
```

---

### Task 6: Detail page — `app/dashboard/vendors/[id]/`

**Files:**
- Create: `app/dashboard/vendors/[id]/page.tsx`
- Create: `app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx`
- Create: `app/dashboard/vendors/[id]/_components/vendor-document-approval-row.tsx`

**Interfaces:**
- Consumes: `RejectReasonDialog` (Task 4), `useVendorDetail`, `useApproveVendor`, `useRejectVendor`, `useApproveVendorDocument`, `useRejectVendorDocument` (Task 3), `VendorStatusBadge` (Task 2), `getVendorDocumentViewUrl` and `VendorDocument` from `@/lib/vendor/api` / `@/lib/vendor/types` (existing — this is the same view-URL helper `document-row.tsx` already uses; the backend's `viewVendorDocument` controller method already permits any `user_type === internal` caller regardless of document ownership, so no new endpoint is needed for viewing).

- [ ] **Step 1: Create `app/dashboard/vendors/[id]/page.tsx`**

Confirmed against this project's bundled Next.js docs (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`): in a Client Component page, `params` is a `Promise` unwrapped via React's `use()`.

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

- [ ] **Step 2: Create `app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx`**

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

- [ ] **Step 3: Create `app/dashboard/vendors/[id]/_components/vendor-document-approval-row.tsx`**

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

- [ ] **Step 4: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 5: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 6: Build**

Run (from `frontend/`): `npm run build`
Expected: the compile phase succeeds for the new `/dashboard/vendors/[id]` route, same caveat as Task 5 Step 6 regarding the pre-existing `reset-password-view.tsx` error.

- [ ] **Step 7: Manual verification**

If `npm run dev` and browser access are available: navigate to `/dashboard/vendors/1` (any id) as an internal user — confirm it doesn't crash while the (failing, no-backend) query resolves, shows the "ไม่พบข้อมูลผู้ขายรายนี้" state instead of a blank page or thrown error, and that the sidebar's "อนุมัติผู้ขาย" item is highlighted (proves Task 1's `startsWith` fix works on a nested route). Also open the reject dialog (vendor-level "ปฏิเสธผู้ขาย" button won't be reachable without real data — if so, disclose that this specific check couldn't be performed without backend data, rather than skipping the report entirely). If browser access is unavailable, disclose that explicitly.

- [ ] **Step 8: Commit**

```bash
git add "app/dashboard/vendors/[id]/"
git commit -m "feat(vendor-approval): add vendor detail page with profile and document approve/reject"
```
