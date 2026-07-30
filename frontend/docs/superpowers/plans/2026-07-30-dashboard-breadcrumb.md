# Dashboard Breadcrumb Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add breadcrumb navigation above the `<h1>` of every `app/dashboard/` page except the root, so users on `/dashboard/tor`, `/dashboard/vendors`, and `/dashboard/vendors/[id]` can navigate back up the hierarchy without the browser back button.

**Architecture:** One new dependency-free UI primitive (`components/ui/breadcrumb.tsx`, plain `<nav>/<ol>/<li>` wrapping Next's `<Link>` — no `@base-ui/react` needed since breadcrumbs have no interactive/popup state), manually composed per page (no auto-generation from the URL — only 4 routes exist today). The vendor detail page's breadcrumb needs its last crumb (vendor name) to show a `Skeleton` while `useVendorDetail` is pending, which requires restructuring `vendor-detail-view.tsx` so the breadcrumb renders unconditionally instead of being skipped by the existing early-returns.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 (strict), `lucide-react` (icons), no `@base-ui/react` needed for this feature. No test runner configured in this repo — verification is `tsc --noEmit`, `eslint`, `next build`, and manual checks via `npm run dev` where possible.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-30-dashboard-breadcrumb-design.md` — read it for full context/rationale behind every decision below.
- **Manual per-page breadcrumbs only.** Do not build a URL-to-label mapping or auto-generation system — explicitly out of scope per the spec (only 4 dashboard routes exist).
- **`app/dashboard/page.tsx` (root) gets no breadcrumb.** A single-crumb breadcrumb has no navigational value.
- Breadcrumb placement is above each page's existing `<h1>`, inside the page's own JSX — `app/dashboard/layout.tsx` is not touched.
- Every breadcrumb's non-current crumbs link with `routes.dashboards.*` (from `lib/routes.ts`), never a hardcoded path string.
- File paths below are relative to `frontend/` (repo root `D:\E-Procurement-System`, `frontend/`/`backend/` are siblings). You are on git branch `Internal`.
- Verify TypeScript with `npx tsc --noEmit` from `frontend/`. Baseline confirmed 2026-07-30: **8** pre-existing, unrelated errors (2x `app/(auth)/reset-password/_components/reset-password-view.tsx` `TS2339`, 6x `lib/auth/permissions.ts` `TS2345`). Confirm no *new* errors after each task.
- Verify lint with `npm run lint` from `frontend/`. Baseline confirmed 2026-07-30: **8** pre-existing `react/no-unescaped-entities` errors (`components/legal/privacy-content.tsx` x2, `components/legal/terms-content.tsx` x6). Confirm no *new* errors after each task.
- No browser automation is available in this environment. Any step requiring visual confirmation of rendered output must be explicitly disclosed as unverified rather than asserted.
- Existing primitives already confirmed present and usable as-is: `Skeleton` (`components/ui/skeleton.tsx`), `ChevronRightIcon` from `lucide-react` (already used the same way in `components/ui/dropdown-menu.tsx`).

---

### Task 1: `components/ui/breadcrumb.tsx` primitive

**Files:**
- Create: `components/ui/breadcrumb.tsx`

**Interfaces:**
- Produces (used by Tasks 2, 3, 4): `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink` (`React.ComponentProps<typeof Link>`, i.e. takes `href` + children like Next's `Link`), `BreadcrumbPage` (`React.ComponentProps<"span">`), `BreadcrumbSeparator` (no props needed, renders its own icon).
- Consumes: `cn` from `@/lib/utils` (existing), `Link` from `next/link`, `ChevronRightIcon` from `lucide-react`.

- [ ] **Step 1: Create `components/ui/breadcrumb.tsx`**

```tsx
import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" className={className} {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="breadcrumb-link"
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      <ChevronRightIcon />
    </li>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
```

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Commit**

```bash
git add "components/ui/breadcrumb.tsx"
git commit -m "feat(dashboard): add breadcrumb UI primitive"
```

---

### Task 2: Breadcrumb on `/dashboard/tor`

**Files:**
- Modify: `app/dashboard/tor/page.tsx`

**Interfaces:**
- Consumes: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator` (Task 1), `routes.dashboards.dashboard` (existing, `lib/routes.ts`).

- [ ] **Step 1: Replace `app/dashboard/tor/page.tsx`**

Current content is a bare placeholder with no `<h1>`. Give it the same shape as the other dashboard pages (`h1` + breadcrumb above it), keeping the placeholder body text:

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
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
          <BreadcrumbSeparator />
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

- [ ] **Step 2: Type-check**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 3: Lint**

Run (from `frontend/`): `npm run lint`
Expected: same 8 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/tor/page.tsx"
git commit -m "feat(dashboard): add breadcrumb to TOR page"
```

---

### Task 3: Breadcrumb on `/dashboard/vendors`

**Files:**
- Modify: `app/dashboard/vendors/page.tsx`

**Interfaces:**
- Consumes: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator` (Task 1), `routes.dashboards.dashboard` (existing).

- [ ] **Step 1: Modify `app/dashboard/vendors/page.tsx`**

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

Replace with:

```tsx
"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";

export default function VendorRegistrationPage() {
  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={routes.dashboards.dashboard}>แดชบอร์ด</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>ผู้ค้าที่ลงทะเบียน</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
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

### Task 4: Breadcrumb on `/dashboard/vendors/[id]` (with loading skeleton)

**Files:**
- Modify: `app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx`

**Interfaces:**
- Consumes: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator` (Task 1), `Skeleton` from `@/components/ui/skeleton` (existing), `routes.dashboards.dashboard`, `routes.dashboards.vendors.index` (existing).

The breadcrumb must render even while `useVendorDetail` is pending or has errored (its first two crumbs are static; only the third depends on fetched data), but the file's current early-returns (`if (isPending) return ...`, `if (isError || !vendor) return ...`) skip rendering anything else in those states. Restructure to a single return with the breadcrumb always rendered, and the body below it switched by state.

- [ ] **Step 1: Modify `app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx`**

Add these imports alongside the existing ones:

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/routes";
```

Replace the entire `VendorDetailView` function body with:

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

  const handleApprove = () => {
    toast.promise(approveVendor.mutateAsync(undefined), {
      loading: "กำลังอนุมัติ...",
      success: "อนุมัติผู้ขายสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={routes.dashboards.dashboard}>แดชบอร์ด</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={routes.dashboards.vendors.index}>ผู้ค้าที่ลงทะเบียน</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {isPending ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <BreadcrumbPage>{displayName ?? "ไม่พบข้อมูลผู้ขายรายนี้"}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError || !vendor ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่พบข้อมูลผู้ขายรายนี้
        </p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
```

`getErrorMessage`, the imports already at the top of the file (`isAxiosError`, `toast`, `Button`, `Spinner`, `VendorStatusBadge`, `RejectReasonDialog`, `useVendorDetail`, `useApproveVendor`, `useRejectVendor`, `VendorDocumentApprovalRow`) are all unchanged — only the three new imports above are added, and the function body is replaced as shown.

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

If `npm run dev` and browser access are available: navigate to `/dashboard/tor`, `/dashboard/vendors`, and `/dashboard/vendors/1` (any id) as an internal user. Confirm on each: the breadcrumb renders above the `<h1>`/page heading, the non-current crumb(s) are clickable links that navigate correctly (`แดชบอร์ด` → `/dashboard`, and on the detail page `ผู้ค้าที่ลงทะเบียน` → `/dashboard/vendors`), the current-page crumb is plain text (not a link), and on the detail page specifically the last crumb shows a skeleton while the (failing, no-backend) query is pending and then settles to "ไม่พบข้อมูลผู้ขายรายนี้" text once it resolves to an error — this is expected without a live backend per the vendor-approval feature's existing constraints. Also confirm `/dashboard` itself has no breadcrumb. Check both light and dark mode. If browser access is unavailable, disclose that explicitly rather than asserting these render correctly.

- [ ] **Step 6: Commit**

```bash
git add "app/dashboard/vendors/[id]/_components/vendor-detail-view.tsx"
git commit -m "feat(dashboard): add breadcrumb with loading skeleton to vendor detail page"
```
