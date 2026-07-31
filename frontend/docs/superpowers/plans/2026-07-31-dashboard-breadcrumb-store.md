# Dashboard Breadcrumb via Layout + Zustand Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-page manual breadcrumb JSX approach with a single breadcrumb render point in `app/dashboard/layout.tsx`, driven by a new zustand store that pages write to via a `useBreadcrumb` hook, and extend breadcrumb coverage to `/dashboard/vendors` and `/dashboard/vendors/[id]` (which never got one).

**Architecture:** A zustand store (`lib/breadcrumb/store.ts`) holds the current breadcrumb's trailing items (everything after the "แดชบอร์ด" root crumb). A `useBreadcrumb(items)` hook (`lib/breadcrumb/useBreadcrumb.ts`) lets any dashboard page register its items on mount and clears them on unmount. A single client component (`app/dashboard/_components/dashboard-breadcrumb.tsx`), mounted once in `app/dashboard/layout.tsx`, reads the store, prepends the root crumb, and renders using the existing `components/ui/breadcrumb.tsx` primitives. Because hooks can't be called conditionally, pages call `useBreadcrumb` unconditionally near the top of their component and pass a `loading` item when data isn't ready yet — no early-return restructuring needed (unlike the superseded 2026-07-30 plan).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 (strict), zustand 5 (first store in this codebase), `lucide-react` (icons, via the existing breadcrumb primitive). No test runner configured in this repo — verification is `tsc --noEmit`, `eslint`, `next build`, and manual checks via `npm run dev` where possible.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-31-dashboard-breadcrumb-store-design.md` — read it for full context/rationale. It supersedes `docs/superpowers/specs/2026-07-30-dashboard-breadcrumb-design.md` (the old spec's per-page-JSX approach).
- This plan **replaces** the not-yet-executed remainder of the old `docs/superpowers/plans/2026-07-30-dashboard-breadcrumb.md` (its Tasks 3–4, covering `vendors/page.tsx` and `vendors/[id]`, were never run) and **rewrites** what its Tasks 1–2 already produced (`components/ui/breadcrumb.tsx` stays as-is; `app/dashboard/tor/page.tsx` gets rewritten again in Task 5 below).
- New zustand store lives under `lib/breadcrumb/`, following this repo's existing domain-folder convention (`lib/vendor-approval/`, `lib/auth/`, etc.) — not the top-level `hooks/` folder, whose only file (`use-mobile.ts`) is a shadcn-scaffold leftover, not this app's convention.
- File paths below are relative to `frontend/` (repo root `D:\E-Procurement-System`, `frontend/`/`backend/` are siblings). You are on git branch `Internal`.
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Baseline confirmed 2026-07-31: **8** pre-existing, unrelated errors (2x `app/(auth)/reset-password/_components/reset-password-view.tsx` `TS2339`, 6x `lib/auth/permissions.ts` `TS2345`). Confirm no *new* errors after each task.
- Verify lint with `npm run lint` from `frontend/`. Baseline confirmed 2026-07-31: **8** pre-existing `react/no-unescaped-entities` errors (`components/legal/privacy-content.tsx` x2, `components/legal/terms-content.tsx` x6). Confirm no *new* errors after each task.
- No browser automation is available in this environment. Any step requiring visual confirmation of rendered output must be explicitly disclosed as unverified rather than asserted.
- Existing primitives confirmed present and usable as-is: `components/ui/breadcrumb.tsx` (`Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`), `Skeleton` (`components/ui/skeleton.tsx`).

---

### Task 1: `lib/breadcrumb/store.ts` — zustand store

**Files:**
- Create: `lib/breadcrumb/store.ts`

**Interfaces:**
- Produces (used by Tasks 2, 3): `useBreadcrumbStore` (zustand hook), `BreadcrumbItem` type (`{ label?: string; href?: string; loading?: boolean }`).
- Consumes: `create` from `zustand` (existing dependency, never used in this repo before).

- [ ] **Step 1: Create `lib/breadcrumb/store.ts`**

```ts
import { create } from "zustand";

export type BreadcrumbItem = {
  label?: string;
  href?: string;
  loading?: boolean;
};

type BreadcrumbState = {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
  clear: () => void;
};

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  clear: () => set({ items: [] }),
}));
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Commit**

```bash
git add "lib/breadcrumb/store.ts"
git commit -m "feat(breadcrumb): add zustand store for dashboard breadcrumb items"
```

---

### Task 2: `lib/breadcrumb/useBreadcrumb.ts` — registration hook

**Files:**
- Create: `lib/breadcrumb/useBreadcrumb.ts`

**Interfaces:**
- Consumes: `useBreadcrumbStore`, `BreadcrumbItem` (Task 1, `./store`).
- Produces (used by Tasks 5, 6, 7): `useBreadcrumb(items: BreadcrumbItem[]): void`.

- [ ] **Step 1: Create `lib/breadcrumb/useBreadcrumb.ts`**

```ts
import { useEffect } from "react";
import { useBreadcrumbStore, type BreadcrumbItem } from "./store";

export function useBreadcrumb(items: BreadcrumbItem[]) {
  const setItems = useBreadcrumbStore((s) => s.setItems);
  const clear = useBreadcrumbStore((s) => s.clear);
  const key = JSON.stringify(items);

  useEffect(() => {
    setItems(items);
    return () => clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key already captures items' content
  }, [key]);
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
git add "lib/breadcrumb/useBreadcrumb.ts"
git commit -m "feat(breadcrumb): add useBreadcrumb hook for pages to register crumbs"
```

---

### Task 3: `app/dashboard/_components/dashboard-breadcrumb.tsx` — render component

**Files:**
- Create: `app/dashboard/_components/dashboard-breadcrumb.tsx`

**Interfaces:**
- Consumes: `useBreadcrumbStore` (Task 1, `@/lib/breadcrumb/store`), `Breadcrumb`/`BreadcrumbList`/`BreadcrumbItem`/`BreadcrumbLink`/`BreadcrumbPage`/`BreadcrumbSeparator` (existing, `@/components/ui/breadcrumb`), `Skeleton` (existing, `@/components/ui/skeleton`), `routes.dashboards.dashboard` (existing, `@/lib/routes`).
- Produces (used by Task 4): `DashboardBreadcrumb` component (no props, reads store directly).

- [ ] **Step 1: Create `app/dashboard/_components/dashboard-breadcrumb.tsx`**

```tsx
"use client";

import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { routes } from "@/lib/routes";

export function DashboardBreadcrumb() {
  const items = useBreadcrumbStore((s) => s.items);

  if (items.length === 0) return null;

  const allItems = [{ label: "แดชบอร์ด", href: routes.dashboards.dashboard }, ...items];

  return (
    <Breadcrumb className="mb-2">
      <BreadcrumbList>
        {allItems.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.loading ? (
                <Skeleton className="h-4 w-24" />
              ) : item.href ? (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
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
git add "app/dashboard/_components/dashboard-breadcrumb.tsx"
git commit -m "feat(breadcrumb): add DashboardBreadcrumb render component"
```

---

### Task 4: Wire `DashboardBreadcrumb` into `app/dashboard/layout.tsx`

**Files:**
- Modify: `app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `DashboardBreadcrumb` (Task 3, `./_components/dashboard-breadcrumb`).

Current file:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InternalGuard } from "./_components/internal-guard";
import { AppSidebar } from "./_components/app-sidebar";
import { DashboardNavbar } from "./_components/dashboard-navbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: {
    default: "แดชบอร์ด",
    template: "%s | Lotushall Mining E-Bidding",
  },
  description: "แดชบอร์ดสำหรับผู้ใช้งานภายใน Lotushall Mining",
};

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <InternalGuard>
      <SidebarProvider style={{ "--sidebar-width-icon": "74px" } as React.CSSProperties}>
        <DashboardNavbar />
        <AppSidebar />
        <SidebarInset className="pt-14">
          <div className="flex flex-1 flex-col px-6.5 pt-5.5 pb-10">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </InternalGuard>
  );
}
```

- [ ] **Step 1: Replace `app/dashboard/layout.tsx`**

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InternalGuard } from "./_components/internal-guard";
import { AppSidebar } from "./_components/app-sidebar";
import { DashboardNavbar } from "./_components/dashboard-navbar";
import { DashboardBreadcrumb } from "./_components/dashboard-breadcrumb";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: {
    default: "แดชบอร์ด",
    template: "%s | Lotushall Mining E-Bidding",
  },
  description: "แดชบอร์ดสำหรับผู้ใช้งานภายใน Lotushall Mining",
};

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <InternalGuard>
      <SidebarProvider style={{ "--sidebar-width-icon": "74px" } as React.CSSProperties}>
        <DashboardNavbar />
        <AppSidebar />
        <SidebarInset className="pt-14">
          <div className="flex flex-1 flex-col px-6.5 pt-5.5 pb-10">
            <DashboardBreadcrumb />
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </InternalGuard>
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
git add "app/dashboard/layout.tsx"
git commit -m "feat(breadcrumb): render DashboardBreadcrumb once from dashboard layout"
```

---

### Task 5: Migrate `/dashboard/tor` to `useBreadcrumb`

**Files:**
- Modify: `app/dashboard/tor/page.tsx`

**Interfaces:**
- Consumes: `useBreadcrumb` (Task 2, `@/lib/breadcrumb/useBreadcrumb`).

Current file:

```tsx
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";

export default function TorIndex() {
    return (
        <div className="flex flex-col gap-4">
            <Breadcrumb className="mb-2">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href={routes.dashboards.dashboard}>แดชบอร์ด</BreadcrumbLink>
                    </BreadcrumbItem>
                    <span>/</span>
                    <BreadcrumbItem>
                        <BreadcrumbPage>การจัดการ TOR</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-2xl font-bold">การจัดการ TOR</h1>
        </div>
    );
}
```

This page was a server component; it must become a client component since `useBreadcrumb` uses `useEffect`.

- [ ] **Step 1: Replace `app/dashboard/tor/page.tsx`**

```tsx
"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";

export default function TorIndex() {
  useBreadcrumb([{ label: "การจัดการ TOR" }]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">การจัดการ TOR</h1>
    </div>
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
git add "app/dashboard/tor/page.tsx"
git commit -m "refactor(dashboard): migrate TOR page breadcrumb to useBreadcrumb hook"
```

---

### Task 6: Migrate `/dashboard/vendors` to `useBreadcrumb`

**Files:**
- Modify: `app/dashboard/vendors/page.tsx`

**Interfaces:**
- Consumes: `useBreadcrumb` (Task 2, `@/lib/breadcrumb/useBreadcrumb`).

Current file:

```tsx
"use client";


export default function VendorRegistrationPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">ผู้ค้าที่ลงทะเบียน</h1>
    </div>
  );
}
```

- [ ] **Step 1: Replace `app/dashboard/vendors/page.tsx`**

```tsx
"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";

export default function VendorRegistrationPage() {
  useBreadcrumb([{ label: "ผู้ค้าที่ลงทะเบียน" }]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">ผู้ค้าที่ลงทะเบียน</h1>
    </div>
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
git add "app/dashboard/vendors/page.tsx"
git commit -m "feat(dashboard): add breadcrumb to vendor list page"
```

---

### Task 7: Migrate `/dashboard/vendors/[id]` to `useBreadcrumb` (with loading state)

**Files:**
- Modify: `app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx`

**Interfaces:**
- Consumes: `useBreadcrumb` (Task 2, `@/lib/breadcrumb/useBreadcrumb`), `routes.dashboards.vendors.index` (existing, `@/lib/routes`).

Current file:

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

The breadcrumb items depend on `isPending`/`displayName`, both of which are currently computed *after* the early returns. `useBreadcrumb` must be called unconditionally (hooks can't be conditional), so `displayName` needs to move above the early returns too. The early-return structure itself does **not** need to change otherwise — only `DashboardBreadcrumb` (rendered by the layout, outside this component) needs to see the breadcrumb continuously; this component's own returned JSX can keep skipping straight to a spinner/error message as before.

- [ ] **Step 1: Modify `app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx`**

Add two imports alongside the existing ones:

```tsx
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
```

Replace the `VendorDetailView` function body with:

```tsx
export function VendorDetailView({ vendorId }: { vendorId: number }) {
  const { data: vendor, isPending, isError } = useVendorDetail(vendorId);
  const approveVendor = useApproveVendor(vendorId);
  const rejectVendor = useRejectVendor(vendorId);

  const displayName = vendor
    ? vendor.detail.type === "company"
      ? vendor.detail.companyName
      : vendor.detail.storeName
    : undefined;

  useBreadcrumb([
    { label: "ผู้ค้าที่ลงทะเบียน", href: routes.dashboards.vendors.index },
    isPending ? { loading: true } : { label: displayName ?? "ไม่พบข้อมูลผู้ขายรายนี้" },
  ]);

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

`getErrorMessage` and the rest of the file's imports (`isAxiosError`, `toast`, `Button`, `Spinner`, `VendorStatusBadge`, `RejectReasonDialog`, `useVendorDetail`, `useApproveVendor`, `useRejectVendor`, `VendorDocumentApprovalRow`) are unchanged.

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Build**

Run (from `frontend/`): `npm run build`
Expected: the compile phase succeeds for the modified `/dashboard/vendors/[id]` route. The overall command may still exit non-zero solely from the pre-existing `reset-password-view.tsx` type error during the build's type-check phase — that's a pre-existing condition on this branch, not a regression. Report the compile-phase result explicitly.

- [ ] **Step 5: Manual verification**

If `npm run dev` and browser access are available: navigate to `/dashboard`, `/dashboard/tor`, `/dashboard/vendors`, and `/dashboard/vendors/1` (any id) as an internal user. Confirm:
- `/dashboard` shows no breadcrumb.
- `/dashboard/tor` shows "แดชบอร์ด / การจัดการ TOR" with a chevron separator (not a literal `/` character); clicking "แดชบอร์ด" navigates to `/dashboard`.
- `/dashboard/vendors` shows "แดชบอร์ด / ผู้ค้าที่ลงทะเบียน".
- `/dashboard/vendors/1` shows a skeleton at the last crumb while the (failing, no-backend) query is pending, then settles to "ไม่พบข้อมูลผู้ขายรายนี้" text once it resolves to an error — expected without a live backend. "แดชบอร์ด" and "ผู้ค้าที่ลงทะเบียน" both navigate correctly.
- Navigating quickly between `/dashboard/tor` ↔ `/dashboard/vendors` ↔ `/dashboard` doesn't leave a stale breadcrumb from the previous page.
- Both light and dark mode render correctly; breadcrumb wraps instead of overflowing on a narrow viewport.

If browser access is unavailable, disclose that explicitly rather than asserting these render correctly.

- [ ] **Step 6: Commit**

```bash
git add "app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx"
git commit -m "feat(dashboard): add breadcrumb with loading state to vendor detail page"
```
