# TOR List and Detail Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the TOR list page `/dashboard/tors` (search, five filters, sort, table + mobile cards) and the TOR detail page `/dashboard/tors/detail?id=`, on top of the existing `lib/tender/tor/` data layer.

**Architecture:** Mirror `app/dashboard/tender-projects/`: a `_hooks/use-tor-list-page.ts` hook owns draft/applied filter state on top of the shared `useListPageControls`; filter controls are split into fields / bar / sheet / sort files; `DataTable` renders columns on `xl` and `TorCard` below it. The detail page follows `tender-projects/detail/`. Both pages are wrapped in `RequirePermission`, extended to accept any-of permissions.

**Tech Stack:** Next.js 16 (App Router, client components), React, TanStack Query, TanStack Table, Base UI–based `components/ui/*`, Tailwind, date-fns (`th` locale).

**Spec:** `frontend/docs/superpowers/specs/2026-10-31-tor-list-and-detail-page-design.md`

## Global Constraints

- Working directory for every command: `D:\E-Procurement-System\frontend`.
- **Do not commit.** The user's standing rule is no commit without explicit approval. Each task ends by staging its files with `git add`; the controller asks the user before any `git commit`.
- **Backend dependency:** `GET /api/v1/dashboard/tender-projects/select` and the opened `/select` endpoints come from `backend/docs/superpowers/specs/2026-10-31-select-options-internal-access-design.md`, built separately by the backend session. Frontend code compiles without it; the project filter only shows its two fixed items until the endpoint exists.
- The frontend has no page-level test suite and no browser automation is available. Per task, verify with `npx tsc --noEmit` and `npx eslint <changed files>`. Task 7 runs `npm run build` and hands the user a manual QA checklist.
- `AGENTS.md`: this Next.js version differs from training data. Every page here is a `"use client"` component using `useSearchParams` inside `<Suspense>`, exactly as the existing dashboard pages do. Do not introduce server components, `params` props, or new Next APIs.
- Match the surrounding code: 4-space indent in `app/dashboard/**` files, 2-space in `lib/**` and `components/**`; short Thai comments where the existing files have them.
- TOR status labels (from `CONTEXT.md`), in this order: ร่าง, รอพิจารณา, ส่งกลับแก้ไข, อนุมัติแล้ว, เปิดรับซอง, ปิดรับซอง, ไม่มีผู้ยื่นข้อเสนอ, ได้ผู้ชนะ, เสร็จสิ้น, ยกเลิก.
- Dates display as `d MMM yyyy` with `{ locale: th }`; a null date displays `-`.

---

### Task 1: Any-of permission gating (guard + sidebar)

**Files:**
- Modify: `lib/tender/tor/types.ts`
- Modify: `lib/auth/guards/RequirePermission.tsx`
- Modify: `app/dashboard/_components/app-sidebar.tsx:16,26-29,41-47,92-98`

**Interfaces:**
- Produces: `TOR_VIEW_PERMISSIONS: string[]` exported from `@/lib/tender/tor/types`.
- Produces: `<RequirePermission permission="x">` (unchanged) **or** `<RequirePermission permissions={["a","b"]}>` (passes when the user has any). Passing neither is a type error.
- Produces: `NavItem.permissions?: string[]` in the sidebar (replaces `permission?: string`).

- [ ] **Step 1: Add the permission list to the TOR types**

Append to `lib/tender/tor/types.ts`:

```ts

// มีสิทธิ์ตัวใดตัวหนึ่งก็ดูหน้า TOR ได้ — ชุดเดียวกับที่ backend เช็คใน TorPolicy::viewAny
export const TOR_VIEW_PERMISSIONS = ["tors.viewAny", "tors.viewDepartment", "tors.viewOwn"];
```

- [ ] **Step 2: Let `RequirePermission` accept a list**

Replace the whole of `lib/auth/guards/RequirePermission.tsx` with:

```tsx
"use client";

import type { ReactNode } from "react";
import { Forbidden } from "@/components/forbidden";
import { Spinner } from "@/components/ui/spinner";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { useUser } from "@/lib/auth/queries/useUser";

// permission: ต้องมีสิทธิ์นี้ / permissions: มีสิทธิ์ตัวใดตัวหนึ่งในรายการก็ผ่าน
type RequirePermissionProps =
  | { permission: string; permissions?: never; children: ReactNode }
  | { permission?: never; permissions: string[]; children: ReactNode };

export function RequirePermission({ permission, permissions, children }: RequirePermissionProps) {
  const { data: user, isPending } = useUser();

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-6" />
      </div>
    );
  }

  const required = permissions ?? (permission ? [permission] : []);
  if (!hasAnyPermission(user, required)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Switch the sidebar to `permissions` and fix the TOR item**

In `app/dashboard/_components/app-sidebar.tsx`:

Change the import on line 16 from
```ts
import { hasPermission, hasRole } from "@/lib/auth/permissions";
```
to
```ts
import { hasAnyPermission, hasRole } from "@/lib/auth/permissions";
import { TOR_VIEW_PERMISSIONS } from "@/lib/tender/tor/types";
```

Replace the `permission` field of `NavItem` (lines 26-27):
```ts
  /** Visible if the user has this permission. If `role` is also set, either satisfies. */
  permission?: string;
```
with
```ts
  /** Visible if the user has any of these permissions. If `role` is also set, either satisfies. */
  permissions?: string[];
```

Replace the TOR nav item:
```ts
  {
    href: routes.dashboards.tors.index,
    label: "การจัดการ TOR",
    icon: FileText,
    permission: "tor.view",
    role: "admin",
  },
```
with
```ts
  {
    href: routes.dashboards.tors.index,
    label: "การจัดการ TOR",
    icon: FileText,
    permissions: TOR_VIEW_PERMISSIONS,
  },
```

Replace the filter body in `AppSidebar`:
```ts
  const visibleItems = navItems.filter((item) => {
    if (!item.permission && !item.role) return true;
    return (
      (!!item.permission && hasPermission(user, item.permission)) ||
      (!!item.role && hasRole(user, item.role))
    );
  });
```
with
```ts
  const visibleItems = navItems.filter((item) => {
    if (!item.permissions && !item.role) return true;
    return (
      (!!item.permissions && hasAnyPermission(user, item.permissions)) ||
      (!!item.role && hasRole(user, item.role))
    );
  });
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (The existing `RequirePermission permission="users.create"` / `"users.update"` callers still type-check.)

Run: `npx eslint lib/tender/tor/types.ts lib/auth/guards/RequirePermission.tsx app/dashboard/_components/app-sidebar.tsx`
Expected: no errors.

Run: `git grep -n "item.permission\b\|permission: \"tor.view\"" -- app lib components`
Expected: no output.

- [ ] **Step 5: Stage**

```bash
git add lib/tender/tor/types.ts lib/auth/guards/RequirePermission.tsx app/dashboard/_components/app-sidebar.tsx
```

---

### Task 2: TOR status badge, shared procurement methods and fiscal years, detail route

**Files:**
- Create: `components/tor-status-badge.tsx`
- Create: `lib/tender/procurement-methods.ts`
- Create: `lib/tender/fiscal-year-options.ts`
- Modify: `app/dashboard/tender-projects/_components/filters/tender-project-filter-fields.tsx` (use the shared fiscal year options)
- Delete: `app/dashboard/tender-projects/_data/procurement-methods.ts` (and the then-empty `_data/` folder)
- Modify: `app/dashboard/tender-projects/_components/dialogs/procurement-method-combobox.tsx:10`
- Modify: `lib/routes.ts:19-21`

**Interfaces:**
- Produces: `TOR_STATUS_STYLE: Record<TorStatus, { label: string; badge: string; dot: string }>`, `TOR_STATUSES: TorStatus[]`, `TorStatusBadge({ status: string; className?: string })` from `@/components/tor-status-badge`.
- Produces: `PROCUREMENT_METHODS: string[]` from `@/lib/tender/procurement-methods`.
- Produces: `FISCAL_YEAR_OPTIONS: { value: string; label: string }[]` from `@/lib/tender/fiscal-year-options` (first item `{ value: "all", label: "ทุกปีงบประมาณ" }`, then 5 Buddhist years from next year downward).
- Produces: `routes.dashboards.tors.detail(id: number | string): string` → `/dashboard/tors/detail?id=${id}`.

- [ ] **Step 1: Create the status badge**

Create `components/tor-status-badge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import type { TorStatus } from "@/lib/tender/tor/types";
import { cn } from "@/lib/utils";

// ชื่อสถานะตามศัพท์ใน CONTEXT.md (ความคืบหน้าของ TOR)
export const TOR_STATUS_STYLE: Record<TorStatus, { label: string; badge: string; dot: string }> = {
  draft: { label: "ร่าง", badge: "text-gray-600 bg-gray-400/15", dot: "bg-gray-600" },
  in_review: { label: "รอพิจารณา", badge: "text-yellow-700 bg-yellow-400/20", dot: "bg-yellow-600" },
  revision_required: { label: "ส่งกลับแก้ไข", badge: "text-orange-600 bg-orange-400/15", dot: "bg-orange-600" },
  approved: { label: "อนุมัติแล้ว", badge: "text-sky-700 bg-sky-400/15", dot: "bg-sky-600" },
  bidding: { label: "เปิดรับซอง", badge: "text-blue-600 bg-blue-400/15", dot: "bg-blue-600" },
  closed: { label: "ปิดรับซอง", badge: "text-purple-600 bg-purple-400/15", dot: "bg-purple-600" },
  no_bidder: { label: "ไม่มีผู้ยื่นข้อเสนอ", badge: "text-gray-700 bg-gray-500/15", dot: "bg-gray-700" },
  awarded: { label: "ได้ผู้ชนะ", badge: "text-green-600 bg-green-400/15", dot: "bg-green-600" },
  completed: { label: "เสร็จสิ้น", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  cancelled: { label: "ยกเลิก", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
};

// ลำดับตามสายความคืบหน้า — ใช้เป็นลำดับของตัวกรองสถานะด้วย
export const TOR_STATUSES: TorStatus[] = [
  "draft",
  "in_review",
  "revision_required",
  "approved",
  "bidding",
  "closed",
  "no_bidder",
  "awarded",
  "completed",
  "cancelled",
];

export function TorStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = TOR_STATUS_STYLE[status as TorStatus];
  if (!style) return null;

  return (
    <Badge className={cn("tracking-wider", style.badge, className)}>
      <span className={cn("w-1.75 h-1.75 rounded-full", style.dot)} />
      {style.label}
    </Badge>
  );
}
```

- [ ] **Step 2: Move the procurement methods**

Read `app/dashboard/tender-projects/_data/procurement-methods.ts` and create `lib/tender/procurement-methods.ts` with the identical content:

```ts
export const PROCUREMENT_METHODS = [
  "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
  "ตลาดอิเล็กทรอนิกส์ (e-market)",
  "คัดเลือก",
  "เฉพาะเจาะจง",
];
```

(If the old file differs from the block above, copy the old file's content verbatim instead.)

Delete the old file and folder:

```bash
git rm app/dashboard/tender-projects/_data/procurement-methods.ts
```

In `app/dashboard/tender-projects/_components/dialogs/procurement-method-combobox.tsx` change line 10 from
```ts
import { PROCUREMENT_METHODS } from "../../_data/procurement-methods";
```
to
```ts
import { PROCUREMENT_METHODS } from "@/lib/tender/procurement-methods";
```

- [ ] **Step 2b: Share the fiscal year options**

Create `lib/tender/fiscal-year-options.ts`, moving the block verbatim out of `app/dashboard/tender-projects/_components/filters/tender-project-filter-fields.tsx`:

```ts
const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;

// ตัวกรองปีงบประมาณ (พ.ศ.): ปีหน้าย้อนลงไป 5 ปี — ใช้ร่วมกันในหน้าโครงการและหน้า TOR
export const FISCAL_YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "ทุกปีงบประมาณ" },
  ...Array.from({ length: 5 }, (_, i) => {
    const year = CURRENT_BUDDHIST_YEAR + 1 - i;
    return { value: String(year), label: `ปีงบประมาณ ${year}` };
  }),
];
```

In `tender-project-filter-fields.tsx`, delete the local `CURRENT_BUDDHIST_YEAR` and `FISCAL_YEAR_OPTIONS` declarations and add
```ts
import { FISCAL_YEAR_OPTIONS } from "@/lib/tender/fiscal-year-options";
```
next to the other `@/lib/...` imports. Nothing else in that file changes.

- [ ] **Step 3: Add the detail route**

In `lib/routes.ts` replace
```ts
    tors: {
      index: "/dashboard/tors",
    },
```
with
```ts
    tors: {
      index: "/dashboard/tors",
      detail: (id: number | string) => `/dashboard/tors/detail?id=${id}`,
    },
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint components/tor-status-badge.tsx lib/tender/procurement-methods.ts lib/tender/fiscal-year-options.ts lib/routes.ts app/dashboard/tender-projects/_components/dialogs/procurement-method-combobox.tsx app/dashboard/tender-projects/_components/filters/tender-project-filter-fields.tsx`
Expected: no errors.

Run: `git grep -n "_data/procurement-methods\|CURRENT_BUDDHIST_YEAR" -- app`
Expected: no output.

- [ ] **Step 5: Stage**

```bash
git add components/tor-status-badge.tsx lib/tender/procurement-methods.ts lib/tender/fiscal-year-options.ts lib/routes.ts app/dashboard/tender-projects/_components/dialogs/procurement-method-combobox.tsx app/dashboard/tender-projects/_components/filters/tender-project-filter-fields.tsx
```

---

### Task 3: Tender project options data layer

**Files:**
- Modify: `lib/tender/tender-projects/types.ts` (append)
- Modify: `lib/tender/tender-projects/api.ts` (import + append)
- Create: `lib/tender/tender-projects/queries/useTenderProjectOptions.ts`

**Interfaces:**
- Produces: `TenderProjectOption { id: number; projectCode: string; name: string }` from `@/lib/tender/tender-projects/types`.
- Produces: `fetchTenderProjectOptions(): Promise<TenderProjectOption[]>` → `GET /api/v1/dashboard/tender-projects/select`, response `{ data: TenderProjectOption[] }`.
- Produces: `useTenderProjectOptions()` → `useQuery` with key `["tenders_projects", "select"]`.

- [ ] **Step 1: Add the type**

Append to `lib/tender/tender-projects/types.ts`:

```ts

// ตัวเลือกใน dropdown โครงการ (GET /dashboard/tender-projects/select)
export interface TenderProjectOption {
  id: number;
  projectCode: string;
  name: string;
}
```

- [ ] **Step 2: Add the fetcher**

In `lib/tender/tender-projects/api.ts` add `TenderProjectOption,` to the existing `import { ... } from "./types";` list (keep it alphabetical: after `TenderProjectListParams,`), then append:

```ts

export async function fetchTenderProjectOptions(): Promise<TenderProjectOption[]> {
  const { data } = await api.get<{ data: TenderProjectOption[] }>(
    "/api/v1/dashboard/tender-projects/select",
  );
  return data.data;
}
```

- [ ] **Step 3: Add the query hook**

Create `lib/tender/tender-projects/queries/useTenderProjectOptions.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchTenderProjectOptions } from "../api";

// key ขึ้นต้นด้วย "tenders_projects" เพื่อให้ mutation ของโครงการ (invalidate ["tenders_projects"]) refresh ตัวเลือกด้วย
export function useTenderProjectOptions() {
  return useQuery({
    queryKey: ["tenders_projects", "select"],
    queryFn: fetchTenderProjectOptions,
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint lib/tender/tender-projects/types.ts lib/tender/tender-projects/api.ts lib/tender/tender-projects/queries/useTenderProjectOptions.ts`
Expected: no errors.

- [ ] **Step 5: Stage**

```bash
git add lib/tender/tender-projects/types.ts lib/tender/tender-projects/api.ts lib/tender/tender-projects/queries/useTenderProjectOptions.ts
```

---

### Task 4: List page state hook and filter controls

**Files:**
- Create: `app/dashboard/tors/_hooks/use-tor-list-page.ts`
- Create: `app/dashboard/tors/_components/filters/tender-project-filter-combobox.tsx`
- Create: `app/dashboard/tors/_components/filters/tor-filter-fields.tsx`
- Create: `app/dashboard/tors/_components/filters/tor-sort-select.tsx`
- Create: `app/dashboard/tors/_components/filters/tor-filter-sheet.tsx`
- Create: `app/dashboard/tors/_components/filters/tor-filter-bar.tsx`

**Interfaces:**
- Consumes: `TOR_STATUSES`, `TOR_STATUS_STYLE` (Task 2); `PROCUREMENT_METHODS`, `FISCAL_YEAR_OPTIONS` (Task 2); `TenderProjectOption` (Task 3); `useTorsList(params, page, perPage)` and `TorSortBy`, `TorStatus`, `TorStatusFilter` from `lib/tender/tor/` (existing).
- Produces from `use-tor-list-page.ts`:
  - `type TorSortValue = "latest" | \`${TorSortBy}:${ListSortDirection}\``
  - `type TorTenderProjectFilter = number | "none" | undefined`
  - `useTorListPage()` returning `{ search, setSearch, status, setStatus, departmentId, setDepartmentId, fiscalYear, setFiscalYear, procurementMethod, setProcurementMethod, tenderProjectId, setTenderProjectId, sort, setSort, submitFilters, clearFilters, appliedSearch, activeFilterCount, visible: Tor[], pageCount, total, pagination, setPagination, sorting, setSorting, isPending, isFetching, isError }`
- Produces: `TorFilterFieldsProps`, `TorFilterFields`, `TorSortSelect`, `TorFilterSheet`, `TorFilterBar`, `TenderProjectFilterCombobox`. `TorFilterBar` takes `TorFilterFieldsProps & { search, setSearch, sort, setSort, activeFilterCount, onSubmit, onClear }`.

- [ ] **Step 1: Write the list page hook**

Create `app/dashboard/tors/_hooks/use-tor-list-page.ts`:

```ts
"use client";

import { useState } from "react";
import { type ListSortDirection, useListPageControls } from "@/hooks/use-list-page-controls";
import { TOR_STATUSES } from "@/components/tor-status-badge";
import { PROCUREMENT_METHODS } from "@/lib/tender/procurement-methods";
import { useTorsList } from "@/lib/tender/tor/queries/useTorsList";
import type { TorSortBy, TorStatus, TorStatusFilter } from "@/lib/tender/tor/types";

// ต้องตรงกับ id ของคอลัมน์ที่ใช้ SortableHeader ใน columns.tsx — ยกเว้น fiscal_year ที่เรียงได้จาก Select อย่างเดียว
const SORT_BY_VALUES: TorSortBy[] = ["tor_code", "title", "budget_estimate", "fiscal_year", "bidding_end_at"];

// ค่าของ Select เรียงลำดับในตัวกรอง: "latest" = ลำดับ default ของ backend (created_at desc)
export type TorSortValue = "latest" | `${TorSortBy}:${ListSortDirection}`;

// ตัวกรองโครงการ: undefined = ทุกโครงการ, "none" = TOR ที่ไม่สังกัดโครงการ, number = id โครงการ
export type TorTenderProjectFilter = number | "none" | undefined;

function parseStatus(value: string | null): TorStatusFilter {
  return TOR_STATUSES.includes(value as TorStatus) ? (value as TorStatus) : "all";
}

function parsePositiveInt(value: string | null): number | undefined {
  const parsed = Number(value);
  return value && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseProcurementMethod(value: string | null): string | undefined {
  return value && PROCUREMENT_METHODS.includes(value) ? value : undefined;
}

function parseTenderProject(value: string | null): TorTenderProjectFilter {
  return value === "none" ? "none" : parsePositiveInt(value);
}

/**
 * All filters here are staged locally and only sent to the URL (and thus the
 * query) via submitFilters() — nothing auto-applies as the user types or picks
 * an option, so a stray keystroke or accidental select doesn't refetch.
 */
export function useTorListPage() {
  const {
    searchParams,
    updateParams,
    page,
    pageSize,
    pagination,
    setPagination,
    sortBy,
    sortDirection,
    sorting,
    setSorting,
    setSkipSkeleton,
    resolveIsFetching,
  } = useListPageControls({ sortByValues: SORT_BY_VALUES });

  // Applied filters — what's actually driving the current query, read straight from the URL.
  const appliedSearch = searchParams.get("search") ?? "";
  const appliedStatus = parseStatus(searchParams.get("status"));
  const appliedDepartmentId = parsePositiveInt(searchParams.get("department_id"));
  const appliedFiscalYear = parsePositiveInt(searchParams.get("fiscal_year"));
  const appliedProcurementMethod = parseProcurementMethod(searchParams.get("procurement_method"));
  const appliedTenderProjectId = parseTenderProject(searchParams.get("tender_project_id"));

  // Draft filters — what the controls show while the user is still editing them.
  const [search, setSearch] = useState(appliedSearch);
  const [status, setStatus] = useState(appliedStatus);
  const [departmentId, setDepartmentId] = useState(appliedDepartmentId);
  const [fiscalYear, setFiscalYear] = useState(appliedFiscalYear);
  const [procurementMethod, setProcurementMethod] = useState(appliedProcurementMethod);
  const [tenderProjectId, setTenderProjectId] = useState<TorTenderProjectFilter>(appliedTenderProjectId);

  // Draft sort — staged with the filters. When the URL sort changes from elsewhere (a table
  // header click on xl), resync so submitting the filters doesn't revert it.
  const appliedSort: TorSortValue = sortBy ? `${sortBy}:${sortDirection ?? "desc"}` : "latest";
  const [sort, setSort] = useState(appliedSort);
  const [syncedSort, setSyncedSort] = useState(appliedSort);
  if (appliedSort !== syncedSort) {
    setSyncedSort(appliedSort);
    setSort(appliedSort);
  }

  const submitFilters = () => {
    const [nextSortBy, nextSortDirection] = sort === "latest" ? [null, null] : sort.split(":");
    setSkipSkeleton(false);
    updateParams(
      {
        search: search.trim() || null,
        status: status === "all" ? null : status,
        department_id: departmentId ?? null,
        fiscal_year: fiscalYear ?? null,
        procurement_method: procurementMethod ?? null,
        tender_project_id: tenderProjectId ?? null,
        sort_by: nextSortBy,
        sort_direction: nextSortDirection,
      },
      true,
    );
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setDepartmentId(undefined);
    setFiscalYear(undefined);
    setProcurementMethod(undefined);
    setTenderProjectId(undefined);
    setSkipSkeleton(false);
    updateParams(
      {
        search: null,
        status: null,
        department_id: null,
        fiscal_year: null,
        procurement_method: null,
        tender_project_id: null,
      },
      true,
    );
  };

  const list = useTorsList(
    {
      search: appliedSearch || undefined,
      status: appliedStatus === "all" ? undefined : appliedStatus,
      department_id: appliedDepartmentId,
      fiscal_year: appliedFiscalYear,
      procurement_method: appliedProcurementMethod,
      tender_project_id: appliedTenderProjectId,
      sort_by: sortBy,
      sort_direction: sortDirection,
    },
    page,
    pageSize,
  );

  return {
    search,
    setSearch,
    status,
    setStatus,
    departmentId,
    setDepartmentId,
    fiscalYear,
    setFiscalYear,
    procurementMethod,
    setProcurementMethod,
    tenderProjectId,
    setTenderProjectId,
    sort,
    setSort,
    submitFilters,
    clearFilters,
    appliedSearch,
    // ตัวกรองที่ใช้กับผลลัพธ์อยู่ (ไม่นับค้นหาและการเรียงลำดับ) — ตัวเลขบนปุ่มตัวกรอง / ข้อความตอนไม่พบผลลัพธ์
    activeFilterCount: [
      appliedStatus !== "all",
      appliedDepartmentId !== undefined,
      appliedFiscalYear !== undefined,
      appliedProcurementMethod !== undefined,
      appliedTenderProjectId !== undefined,
    ].filter(Boolean).length,
    visible: list.data?.data ?? [],
    pageCount: list.data?.meta.lastPage ?? 0,
    total: list.data?.meta.total ?? 0,
    pagination,
    setPagination,
    sorting,
    setSorting,
    isPending: list.isPending,
    isFetching: resolveIsFetching(list.isFetching),
    isError: list.isError,
  };
}
```

- [ ] **Step 2: Write the project filter combobox**

Create `app/dashboard/tors/_components/filters/tender-project-filter-combobox.tsx`. It follows `components/department-select.tsx` (string items, `inlineSearch` mode for use inside the bottom sheet):

```tsx
"use client"

import { ChevronDown } from "lucide-react";
import {
    Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
    ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import type { TenderProjectOption } from "@/lib/tender/tender-projects/types";
import { cn } from "@/lib/utils";
import type { TorTenderProjectFilter } from "../../_hooks/use-tor-list-page";

const ALL_LABEL = "ทุกโครงการ";
const NONE_LABEL = "ไม่สังกัดโครงการ";
const PLACEHOLDER = "โครงการ";

// รหัสโครงการไม่ซ้ำกัน label จึงใช้แทนค่าได้
const projectLabel = (project: TenderProjectOption) => `${project.projectCode} · ${project.name}`;

// ระหว่างโหลดหรือโหลดตัวเลือกไม่ได้ จะเหลือแค่ "ทุกโครงการ" กับ "ไม่สังกัดโครงการ"
export function TenderProjectFilterCombobox({
    projects,
    value,
    onValueChange,
    className,
    inlineSearch = false,
}: {
    projects: TenderProjectOption[];
    value: TorTenderProjectFilter;
    onValueChange: (next: TorTenderProjectFilter) => void;
    className?: string;
    // ใน sheet: พิมพ์ค้นหาในช่องเอง แทนช่องค้นหาใน popup ที่ดึง focus ออกนอก sheet
    inlineSearch?: boolean;
}) {
    const entries: [string, TorTenderProjectFilter][] = [
        [ALL_LABEL, undefined],
        [NONE_LABEL, "none"],
        ...projects.map((project): [string, TorTenderProjectFilter] => [projectLabel(project), project.id]),
    ];
    const items = entries.map(([label]) => label);

    // ไม่กรอง = แสดง placeholder; id ที่ยังไม่อยู่ในรายการ (กำลังโหลด) ก็แสดง placeholder เช่นกัน
    const selected =
        value === undefined
            ? null
            : (entries.find(([, entryValue]) => entryValue === value)?.[0] ?? null);

    return (
        <Combobox
            items={items}
            value={selected}
            onValueChange={(next) => {
                if (next === null) return;
                const entry = entries.find(([label]) => label === next);
                if (entry) onValueChange(entry[1]);
            }}
        >
            {inlineSearch ? (
                <ComboboxInput
                    placeholder={PLACEHOLDER}
                    className={cn(
                        "h-10 w-full rounded-sm bg-white",
                        "has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0",
                        className,
                    )}
                />
            ) : (
                <ComboboxTrigger
                    render={
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full justify-between font-normal text-black bg-white hover:bg-white data-popup-open:bg-white data-placeholder:text-gray-400",
                                "focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none",
                                className,
                            )}
                        >
                            <span className="min-w-0 truncate">
                                <ComboboxValue placeholder={PLACEHOLDER} />
                            </span>
                            <ChevronDown />
                        </Button>
                    }
                    className="h-10 rounded-sm"
                />
            )}
            <ComboboxContent>
                {!inlineSearch && (
                    <ComboboxInput
                        showTrigger={false}
                        placeholder="ค้นหาโครงการ"
                        className="
                        bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
                        has-[[data-slot=input-group-control]:focus-visible]:border-transparent
                        has-[[data-slot=input-group-control]:focus-visible]:ring-0
                        "
                    />
                )}
                <ComboboxEmpty>ไม่พบโครงการที่ค้นหา</ComboboxEmpty>
                <ComboboxList>
                    {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                            {item}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
```

- [ ] **Step 3: Write the filter fields**

Create `app/dashboard/tors/_components/filters/tor-filter-fields.tsx`:

```tsx
"use client"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DepartmentSelect } from "@/components/department-select";
import { TOR_STATUS_STYLE, TOR_STATUSES } from "@/components/tor-status-badge";
import type { Department } from "@/lib/internal-profiles/types";
import { FISCAL_YEAR_OPTIONS } from "@/lib/tender/fiscal-year-options";
import { PROCUREMENT_METHODS } from "@/lib/tender/procurement-methods";
import type { TenderProjectOption } from "@/lib/tender/tender-projects/types";
import type { TorStatusFilter } from "@/lib/tender/tor/types";
import type { TorTenderProjectFilter } from "../../_hooks/use-tor-list-page";
import { TenderProjectFilterCombobox } from "./tender-project-filter-combobox";

const ALL_DEPARTMENTS_OPTION = { value: "all", label: "ทุกหน่วยงาน" };

const STATUS_OPTIONS: { value: TorStatusFilter; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    ...TOR_STATUSES.map((status) => ({ value: status, label: TOR_STATUS_STYLE[status].label })),
];

const PROCUREMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
    { value: "all", label: "ทุกวิธีจัดซื้อจัดจ้าง" },
    ...PROCUREMENT_METHODS.map((method) => ({ value: method, label: method })),
];

export interface TorFilterFieldsProps {
    departments: Department[];
    tenderProjects: TenderProjectOption[];
    status: TorStatusFilter;
    setStatus: (value: TorStatusFilter) => void;
    departmentId: number | undefined;
    setDepartmentId: (value: number | undefined) => void;
    fiscalYear: number | undefined;
    setFiscalYear: (value: number | undefined) => void;
    procurementMethod: string | undefined;
    setProcurementMethod: (value: string | undefined) => void;
    tenderProjectId: TorTenderProjectFilter;
    setTenderProjectId: (value: TorTenderProjectFilter) => void;
}

// ใช้ทั้งในแถวตัวกรองบนจอ lg ขึ้นไป และใน sheet ตัวกรองบนจอเล็ก (เต็มความกว้างเมื่อเล็กกว่า lg)
export function TorFilterFields({
    departments,
    tenderProjects,
    status,
    setStatus,
    departmentId,
    setDepartmentId,
    fiscalYear,
    setFiscalYear,
    procurementMethod,
    setProcurementMethod,
    tenderProjectId,
    setTenderProjectId,
    inSheet = false,
}: TorFilterFieldsProps & {
    // ใน sheet: ช่องที่พิมพ์ค้นหาได้ใช้ inlineSearch แทนช่องค้นหาใน popup ที่ดึง focus ออกนอก sheet
    inSheet?: boolean;
}) {
    return (
        <>
            <Select
                items={STATUS_OPTIONS}
                value={status === "all" ? null : status}
                onValueChange={(value) => setStatus((value ?? "all") as TorStatusFilter)}
            >
                <SelectTrigger className="w-full lg:w-44 h-10! bg-white rounded-sm">
                    <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent side="bottom" alignItemWithTrigger={false}>
                    {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <DepartmentSelect
                departments={departments}
                value={departmentId !== undefined ? String(departmentId) : "all"}
                onValueChange={(value) => setDepartmentId(value === "all" ? undefined : Number(value))}
                allOption={ALL_DEPARTMENTS_OPTION}
                placeholder="หน่วยงาน"
                className="lg:w-44"
                inlineSearch={inSheet}
            />

            <Select
                items={FISCAL_YEAR_OPTIONS}
                value={fiscalYear !== undefined ? String(fiscalYear) : null}
                onValueChange={(value) => setFiscalYear(value && value !== "all" ? Number(value) : undefined)}
            >
                <SelectTrigger className="w-full lg:w-44 h-10! bg-white rounded-sm">
                    <SelectValue placeholder="ปีงบประมาณ" />
                </SelectTrigger>
                <SelectContent side="bottom" alignItemWithTrigger={false}>
                    {FISCAL_YEAR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                items={PROCUREMENT_METHOD_OPTIONS}
                value={procurementMethod ?? null}
                onValueChange={(value) => setProcurementMethod(value && value !== "all" ? value : undefined)}
            >
                <SelectTrigger className="w-full lg:w-56 h-10! bg-white rounded-sm">
                    <SelectValue placeholder="วิธีจัดซื้อจัดจ้าง" />
                </SelectTrigger>
                <SelectContent side="bottom" alignItemWithTrigger={false}>
                    {PROCUREMENT_METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <TenderProjectFilterCombobox
                projects={tenderProjects}
                value={tenderProjectId}
                onValueChange={setTenderProjectId}
                className="lg:w-60"
                inlineSearch={inSheet}
            />
        </>
    );
}
```

- [ ] **Step 4: Write the sort select**

Create `app/dashboard/tors/_components/filters/tor-sort-select.tsx`:

```tsx
"use client"

import { ArrowUpDown } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TorSortValue } from "../../_hooks/use-tor-list-page";

// ครบทุกคู่ (คอลัมน์ × ทิศทาง) ที่หัวตารางบนจอ xl ตั้งได้ ค่าใน URL จึงมีตัวเลือกตรงกันเสมอ
// (ปีงบประมาณไม่มีหัวตารางของตัวเอง เรียงได้จากที่นี่เท่านั้น)
const SORT_OPTIONS: { value: TorSortValue; label: string }[] = [
    { value: "latest", label: "เพิ่มล่าสุด" },
    { value: "bidding_end_at:asc", label: "ปิดรับซอง ใกล้ → ไกล" },
    { value: "bidding_end_at:desc", label: "ปิดรับซอง ไกล → ใกล้" },
    { value: "budget_estimate:desc", label: "ราคากลาง มาก → น้อย" },
    { value: "budget_estimate:asc", label: "ราคากลาง น้อย → มาก" },
    { value: "title:asc", label: "ชื่อ TOR ก → ฮ" },
    { value: "title:desc", label: "ชื่อ TOR ฮ → ก" },
    { value: "tor_code:desc", label: "รหัส TOR ใหม่ → เก่า" },
    { value: "tor_code:asc", label: "รหัส TOR เก่า → ใหม่" },
    { value: "fiscal_year:desc", label: "ปีงบประมาณ ใหม่ → เก่า" },
    { value: "fiscal_year:asc", label: "ปีงบประมาณ เก่า → ใหม่" },
];

// การ์ดบนจอเล็กกว่า xl ไม่มีหัวตารางให้กด sort จึงเลือกลำดับจากตัวกรองแทน
export function TorSortSelect({
    value,
    onValueChange,
    className,
}: {
    value: TorSortValue;
    onValueChange: (value: TorSortValue) => void;
    className?: string;
}) {
    return (
        <Select
            items={SORT_OPTIONS}
            value={value}
            onValueChange={(next) => onValueChange((next ?? "latest") as TorSortValue)}
        >
            <SelectTrigger aria-label="เรียงตาม" className={cn("w-full h-10! bg-white rounded-sm", className)}>
                <ArrowUpDown className="size-4 shrink-0 text-gray-500" aria-hidden="true" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
                {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
```

Note: unlike the tender project page, the sort Select must stay visible on `xl` too, because `fiscal_year` has no header to click. Task 4 Step 6 renders it without `xl:hidden`.

- [ ] **Step 5: Write the filter sheet**

Create `app/dashboard/tors/_components/filters/tor-filter-sheet.tsx`:

```tsx
"use client"

import { ListFilterSheet, ListFilterSheetSection } from "@/components/list-filter-sheet";
import type { TorSortValue } from "../../_hooks/use-tor-list-page";
import { TorFilterFields, type TorFilterFieldsProps } from "./tor-filter-fields";
import { TorSortSelect } from "./tor-sort-select";

// ตัวกรอง + การเรียงลำดับบนจอเล็กกว่า lg (ตัวกรองแบบร่าง: มีผลเมื่อกด "แสดงผล")
export function TorFilterSheet({
    sort,
    setSort,
    activeCount,
    onApply,
    onClear,
    ...fields
}: TorFilterFieldsProps & {
    sort: TorSortValue;
    setSort: (value: TorSortValue) => void;
    activeCount: number;
    onApply: () => void;
    onClear: () => void;
}) {
    return (
        <ListFilterSheet activeCount={activeCount} onApply={onApply} onClear={onClear}>
            <ListFilterSheetSection title="ตัวกรอง">
                <TorFilterFields {...fields} inSheet />
            </ListFilterSheetSection>

            <ListFilterSheetSection title="เรียงตาม">
                <TorSortSelect value={sort} onValueChange={setSort} />
            </ListFilterSheetSection>
        </ListFilterSheet>
    );
}
```

- [ ] **Step 6: Write the filter bar**

Create `app/dashboard/tors/_components/filters/tor-filter-bar.tsx`:

```tsx
"use client"

import { Search } from "lucide-react";
import { ListClearButton } from "@/components/list-filter-sheet";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import type { TorSortValue } from "../../_hooks/use-tor-list-page";
import { TorFilterFields, type TorFilterFieldsProps } from "./tor-filter-fields";
import { TorFilterSheet } from "./tor-filter-sheet";
import { TorSortSelect } from "./tor-sort-select";

/**
 * - เล็กกว่า lg: ช่องค้นหา + ปุ่มเปิด sheet (ตัวกรอง + เรียงลำดับ) + ปุ่มล้าง
 * - lg ขึ้นไป: wrapper เป็น `contents` ให้ทุกช่องเรียงแถวเดียว; Select เรียงลำดับแสดงถึง xl ด้วย
 *   เพราะปีงบประมาณไม่มีหัวตารางให้กด sort
 */
export function TorFilterBar({
    search,
    setSearch,
    sort,
    setSort,
    activeFilterCount,
    onSubmit,
    onClear,
    ...fields
}: TorFilterFieldsProps & {
    search: string;
    setSearch: (value: string) => void;
    sort: TorSortValue;
    setSort: (value: TorSortValue) => void;
    activeFilterCount: number;
    onSubmit: () => void;
    onClear: () => void;
}) {
    return (
        <form
            className="flex flex-col gap-3 lg:flex-row lg:flex-wrap"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
        >
            <div className="flex gap-2 lg:contents">
                <SearchInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder="ค้นหาชื่อ TOR | รหัส TOR"
                    className="lg:min-w-72"
                />

                <div className="flex gap-2 lg:hidden">
                    <TorFilterSheet
                        {...fields}
                        sort={sort}
                        setSort={setSort}
                        activeCount={activeFilterCount}
                        onApply={onSubmit}
                        onClear={onClear}
                    />

                    <ListClearButton onClear={onClear} />
                </div>
            </div>

            <div className="hidden lg:contents">
                <TorFilterFields {...fields} />

                <TorSortSelect value={sort} onValueChange={setSort} className="lg:w-60" />

                <Button
                    type="submit"
                    aria-label="ค้นหา"
                    className="h-10 shrink-0 bg-red-700 text-white hover:bg-red-600"
                >
                    <Search className="size-4" />
                    ค้นหา
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    aria-label="ล้างตัวกรอง"
                    className="h-10 shrink-0 bg-white"
                    onClick={onClear}
                >
                    ล้างตัวกรอง
                </Button>
            </div>
        </form>
    );
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. If `Combobox`'s `onValueChange` parameter is not inferred as `string | null`, annotate it as `(next: string | null) =>` (as `DepartmentSelect` relies on inference, it should be).

Run: `npx eslint app/dashboard/tors/_hooks app/dashboard/tors/_components/filters`
Expected: no errors.

- [ ] **Step 8: Stage**

```bash
git add app/dashboard/tors/_hooks app/dashboard/tors/_components/filters
```

---

### Task 5: Table, mobile card, skeleton and the list page

**Files:**
- Create: `app/dashboard/tors/_components/table/columns.tsx`
- Create: `app/dashboard/tors/_components/table/tor-card.tsx`
- Create: `app/dashboard/tors/_components/tor-list-skeleton.tsx`
- Modify (replace): `app/dashboard/tors/page.tsx`

**Interfaces:**
- Consumes: `useTorListPage()` and `TorFilterBar` (Task 4); `TorStatusBadge` and `routes.dashboards.tors.detail` (Task 2); `TOR_VIEW_PERMISSIONS` and `RequirePermission permissions` (Task 1); `useTenderProjectOptions` (Task 3); `useDepartmentOptions` (existing, `@/lib/internal-profiles/queries/useDepartmentOptions`); `DataTable` props `columns, data, pageCount, total, pagination, onPaginationChange, sorting, onSortingChange, renderMobileCard`.
- Produces: `torColumns: ColumnDef<Tor>[]`, `TorCard({ tor: Tor })`, `TorTableSkeleton`, `TorListSkeleton`.

- [ ] **Step 1: Write the columns**

Create `app/dashboard/tors/_components/table/columns.tsx`:

```tsx
"use client"

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TorStatusBadge } from "@/components/tor-status-badge";
import { SortableHeader } from "@/components/ui/data-table-sortable-header";
import { routes } from "@/lib/routes";
import type { Tor } from "@/lib/tender/tor/types";
import { formatCurrency } from "@/lib/utils";

const HEADER_TEXT_CLASS = "text-sm font-bold text-gray-500";
// ตัด padding/negative margin ของปุ่ม ghost ออก ให้หัวที่ sort ได้กว้างแค่ข้อความ + ไอคอน ไม่ดันตารางจน overflow
const SORTABLE_HEADER_CLASS = `${HEADER_TEXT_CLASS} mx-0 px-0 hover:bg-transparent`;

function ColumnHeader({ label, align }: { label: string; align?: "left" | "center" | "right" }) {
    return <p className={`${HEADER_TEXT_CLASS} ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}>{label}</p>;
}

// id ของคอลัมน์ที่ sort ได้ต้องตรงกับ SORT_BY_VALUES ใน use-tor-list-page.ts
export const torColumns: ColumnDef<Tor>[] = [
    {
        id: "tor_code",
        header: ({ column }) => <SortableHeader column={column} label="รหัส TOR" className={SORTABLE_HEADER_CLASS} />,
        accessorFn: (tor) => tor.torCode,
        // รหัสและชื่อ TOR เป็นลิงก์ไปหน้า detail (ไม่มีคอลัมน์ Actions)
        cell: ({ getValue, row }) => (
            <Link
                href={routes.dashboards.tors.detail(row.original.id)}
                className="text-xs text-red-700 font-semibold underline decoration-red-700/30 underline-offset-4 hover:decoration-red-700"
            >
                {getValue<string>()}
            </Link>
        ),
    },
    {
        id: "title",
        header: ({ column }) => <SortableHeader column={column} label="TOR / หน่วยงาน" className={SORTABLE_HEADER_CLASS} />,
        accessorFn: (tor) => tor.title,
        cell: ({ getValue, row }) => (
            <Link
                href={routes.dashboards.tors.detail(row.original.id)}
                className="group flex flex-col"
            >
                <p className="text-sm font-semibold tracking-wider leading-6 underline decoration-gray-300 underline-offset-4 group-hover:decoration-current">{getValue<string>()}</p>
                <p className="text-xs text-gray-600 tracking-wider">{row.original.department.name}</p>
            </Link>
        ),
    },
    {
        id: "tender_project",
        header: () => <ColumnHeader label="โครงการ" />,
        accessorFn: (tor) => tor.tenderProject?.projectCode ?? "-",
        cell: ({ row }) => {
            const project = row.original.tenderProject;
            return project ? (
                <Link
                    href={routes.dashboards.tender_project.detail(project.id)}
                    title={project.name}
                    className="text-xs font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 hover:decoration-current"
                >
                    {project.projectCode}
                </Link>
            ) : (
                <p className="text-sm text-gray-500">-</p>
            );
        },
    },
    {
        id: "procurement_method",
        header: () => <ColumnHeader label="วิธีจัดซื้อจัดจ้าง" />,
        accessorFn: (tor) => tor.procurementMethod,
        cell: ({ getValue }) => (
            <p className="text-sm text-gray-600 tracking-wider">{getValue<string>()}</p>
        ),
    },
    {
        id: "budget_estimate",
        header: ({ column }) => <SortableHeader column={column} label="ราคากลาง" align="right" className={SORTABLE_HEADER_CLASS} />,
        accessorFn: (tor) => tor.budgetEstimate,
        cell: ({ getValue, row }) => (
            <div className="flex flex-col items-end">
                <p className="text-sm font-normal tracking-wider">ปีงบประมาณ {row.original.fiscalYear}</p>
                <p className="text-sm font-bold text-right">{formatCurrency(Number(getValue<string>()))}</p>
            </div>
        ),
    },
    {
        id: "bidding_end_at",
        header: ({ column }) => <SortableHeader column={column} label="ปิดรับซอง" className={SORTABLE_HEADER_CLASS} />,
        accessorFn: (tor) => tor.biddingEndAt,
        cell: ({ getValue }) => {
            const value = getValue<string | null>();
            return (
                <p className="text-sm">
                    {value ? format(new Date(value), "d MMM yyyy", { locale: th }) : "-"}
                </p>
            );
        },
    },
    {
        id: "status",
        header: () => <ColumnHeader label="สถานะ" align="center" />,
        accessorFn: (tor) => tor.status,
        cell: ({ row }) => (
            <div className="flex justify-center">
                <TorStatusBadge status={row.original.status} />
            </div>
        ),
    },
];
```

- [ ] **Step 2: Write the mobile card**

Create `app/dashboard/tors/_components/table/tor-card.tsx`:

```tsx
"use client"

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TorStatusBadge } from "@/components/tor-status-badge";
import { routes } from "@/lib/routes";
import type { Tor } from "@/lib/tender/tor/types";
import { formatCurrency } from "@/lib/utils";

// การ์ดที่ใช้แทนแถวตารางบนจอเล็กกว่า xl (ส่งเข้า DataTable ผ่าน renderMobileCard)
export function TorCard({ tor }: { tor: Tor }) {
    return (
        <article className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-col gap-2.5 p-4 pb-3.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-red-700 tracking-wider">{tor.torCode}</span>
                    <TorStatusBadge status={tor.status} />
                </div>

                <Link href={routes.dashboards.tors.detail(tor.id)} className="group flex flex-col gap-1">
                    <p className="text-base font-bold leading-relaxed tracking-wide group-hover:underline group-hover:underline-offset-4">
                        {tor.title}
                    </p>
                    <p className="text-xs text-gray-600 tracking-wider">{tor.department.name}</p>
                </Link>

                <div className="flex flex-col gap-0.5 pt-1">
                    <p className="text-xs text-gray-500 tracking-wider">ราคากลาง · ปี {tor.fiscalYear}</p>
                    <p className="text-xl font-bold tracking-wide">{formatCurrency(Number(tor.budgetEstimate))}</p>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
                <span className="min-w-0 truncate">{tor.procurementMethod}</span>
                <span className="flex shrink-0 items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {tor.biddingEndAt
                        ? `ปิดรับซอง ${format(new Date(tor.biddingEndAt), "d MMM yyyy", { locale: th })}`
                        : "ยังไม่กำหนดวันปิดรับซอง"}
                </span>
            </div>
        </article>
    );
}
```

- [ ] **Step 3: Write the skeletons**

Create `app/dashboard/tors/_components/tor-list-skeleton.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const SKELETON_ROWS = 6;
// หนึ่งค่าต่อคอลัมน์ใน columns.tsx (7 คอลัมน์)
const COLUMN_WIDTHS = ["w-20", "w-40", "w-20", "w-28", "w-24", "w-20", "w-16"];

function TorCardSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex justify-between border-t bg-gray-50 px-4 py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
            </div>
        </div>
    );
}

function TorTableSkeletonDesktop() {
    return (
        <div className="hidden overflow-hidden rounded-xl border shadow-md xl:block">
            <Table>
                <TableHeader className="bg-[#F7F8FA]">
                    <TableRow>
                        {COLUMN_WIDTHS.map((width, index) => (
                            <TableHead key={index} className="px-4 py-3">
                                <Skeleton className={`h-4 ${width}`} />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
                        <TableRow key={rowIndex} className="even:bg-[#F7F8FA] odd:bg-white">
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <div className="flex flex-col gap-1.5">
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-28" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <div className="flex flex-col items-end gap-1.5">
                                    <Skeleton className="h-3.5 w-24" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="mx-auto h-5 w-16 rounded-full" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export function TorTableSkeleton() {
    return (
        <>
            <div className="grid gap-3 sm:grid-cols-2 xl:hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                    <TorCardSkeleton key={index} />
                ))}
            </div>
            <TorTableSkeletonDesktop />
        </>
    );
}

export function TorListSkeleton() {
    return (
        <div className="flex flex-col gap-5">
            <TorTableSkeleton />
        </div>
    );
}
```

- [ ] **Step 4: Replace the list page**

Replace the whole of `app/dashboard/tors/page.tsx` with:

```tsx
"use client";

import { Suspense } from "react";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { DataTable } from "@/components/ui/data-table";
import { RequirePermission } from "@/lib/auth/guards/RequirePermission";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { useTenderProjectOptions } from "@/lib/tender/tender-projects/queries/useTenderProjectOptions";
import { TOR_VIEW_PERMISSIONS } from "@/lib/tender/tor/types";
import { useTorListPage } from "./_hooks/use-tor-list-page";
import { TorListSkeleton, TorTableSkeleton } from "./_components/tor-list-skeleton";
import { TorFilterBar } from "./_components/filters/tor-filter-bar";
import { torColumns } from "./_components/table/columns";
import { TorCard } from "./_components/table/tor-card";

function TorsPageContent() {
    useBreadcrumb([{ label: "การจัดการ TOR" }]);

    // โหลดไม่ได้ = dropdown เหลือแค่ตัวเลือกคงที่ ("ทุกหน่วยงาน" / "ทุกโครงการ", "ไม่สังกัดโครงการ")
    const { data: departmentOptions } = useDepartmentOptions();
    const { data: tenderProjectOptions } = useTenderProjectOptions();

    const {
        search,
        setSearch,
        status,
        setStatus,
        departmentId,
        setDepartmentId,
        fiscalYear,
        setFiscalYear,
        procurementMethod,
        setProcurementMethod,
        tenderProjectId,
        setTenderProjectId,
        sort,
        setSort,
        submitFilters,
        clearFilters,
        appliedSearch,
        activeFilterCount,
        visible,
        pageCount,
        total,
        pagination,
        setPagination,
        sorting,
        setSorting,
        isPending,
        isFetching,
        isError,
    } = useTorListPage();

    return (
        <div className="flex flex-col gap-5">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">การจัดการ TOR</h1>
                <p className="text-sm text-gray-600 tracking-wide">
                    ภาพรวมทั้งหมดและ TOR ที่เกี่ยวข้อง
                </p>
            </div>

            <TorFilterBar
                departments={departmentOptions ?? []}
                tenderProjects={tenderProjectOptions ?? []}
                search={search}
                setSearch={setSearch}
                status={status}
                setStatus={setStatus}
                departmentId={departmentId}
                setDepartmentId={setDepartmentId}
                fiscalYear={fiscalYear}
                setFiscalYear={setFiscalYear}
                procurementMethod={procurementMethod}
                setProcurementMethod={setProcurementMethod}
                tenderProjectId={tenderProjectId}
                setTenderProjectId={setTenderProjectId}
                sort={sort}
                setSort={setSort}
                activeFilterCount={activeFilterCount}
                onSubmit={submitFilters}
                onClear={clearFilters}
            />

            {isError ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    ไม่สามารถโหลดข้อมูล TOR ได้ กรุณาลองใหม่อีกครั้ง
                </p>
            ) : isPending || isFetching ? (
                <TorTableSkeleton />
            ) : visible.length > 0 ? (
                <DataTable
                    columns={torColumns}
                    data={visible}
                    pageCount={pageCount}
                    total={total}
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    sorting={sorting}
                    onSortingChange={setSorting}
                    renderMobileCard={(tor) => <TorCard tor={tor} />}
                />
            ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {appliedSearch
                        ? "ไม่พบ TOR ที่ตรงกับคำค้นหา"
                        : activeFilterCount > 0
                            ? "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก"
                            : "ยังไม่มี TOR ในระบบ"
                    }
                </p>
            )}
        </div>
    );
}

export default function TorsPage() {
    return (
        <Suspense fallback={<TorListSkeleton />}>
            <RequirePermission permissions={TOR_VIEW_PERMISSIONS}>
                <TorsPageContent />
            </RequirePermission>
        </Suspense>
    );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint app/dashboard/tors`
Expected: no errors.

- [ ] **Step 6: Stage**

```bash
git add app/dashboard/tors/page.tsx app/dashboard/tors/_components/table app/dashboard/tors/_components/tor-list-skeleton.tsx
```

---

### Task 6: TOR detail page

**Files:**
- Create: `app/dashboard/tors/detail/_hooks/use-tor-detail-page.ts`
- Create: `app/dashboard/tors/detail/page.tsx`

**Interfaces:**
- Consumes: `useTorDetail(id)` (existing, `@/lib/tender/tor/queries/useTorDetail`); `TorStatusBadge`, `routes.dashboards.tors.index`, `routes.dashboards.tender_project.detail` (Task 2); `RequirePermission permissions` and `TOR_VIEW_PERMISSIONS` (Task 1).
- Produces: `useTorDetailPage(id: number)` → `{ tor: Tor | undefined; isValidId: boolean; isPending: boolean; notFound: boolean }`.

- [ ] **Step 1: Write the detail hook**

Create `app/dashboard/tors/detail/_hooks/use-tor-detail-page.ts`:

```ts
"use client";

import { useTorDetail } from "@/lib/tender/tor/queries/useTorDetail";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";

// 404 จาก API (ไม่มี TOR นี้ หรืออยู่นอกขอบเขตที่ผู้ใช้ดูได้) จะเป็น isError → notFound
export function useTorDetailPage(id: number) {
  const isValidId = Number.isFinite(id) && id > 0;
  const { data: tor, isPending, isError } = useTorDetail(id);
  const notFound =
    !isValidId || (isError && !tor) || (!isPending && !tor);

  useBreadcrumb([
    {
      label: "การจัดการ TOR",
      href: routes.dashboards.tors.index,
    },
    isValidId && isPending
      ? { loading: true }
      : { label: tor?.title ?? "ไม่พบข้อมูล" },
  ]);

  return { tor, isValidId, isPending, notFound };
}
```

- [ ] **Step 2: Write the detail page**

Create `app/dashboard/tors/detail/page.tsx`:

```tsx
"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TorStatusBadge } from "@/components/tor-status-badge";
import { RequirePermission } from "@/lib/auth/guards/RequirePermission";
import { routes } from "@/lib/routes";
import { TOR_VIEW_PERMISSIONS, type TorUserSummary } from "@/lib/tender/tor/types";
import { formatCurrency } from "@/lib/utils";
import { useTorDetailPage } from "./_hooks/use-tor-detail-page";

const CARD_CLASS = "shadow-md shadow-gray-200 border-gray-200";

const formatTorDate = (value: string | null) =>
    value ? format(new Date(value), "d MMM yyyy", { locale: th }) : "-";

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold tracking-wide text-gray-500">{label}</p>
            <div className="text-base font-semibold tracking-wider">{children}</div>
        </div>
    );
}

// ผู้สร้าง / ผู้อนุมัติ: ไม่มีผู้ใช้ ไม่มีโปรไฟล์ (name null) หรือไม่มีหน่วยงาน แสดง "-"
function PersonRow({ label, person, extra }: { label: string; person: TorUserSummary | null; extra?: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <p className="w-28 shrink-0 text-sm font-bold tracking-wide text-gray-500">{label}</p>
            <p className="text-base tracking-wider">
                <span className="font-semibold">{person?.name ?? "-"}</span>
                <span className="text-gray-600"> · {person?.department?.name ?? "-"}</span>
                {extra}
            </p>
        </div>
    );
}

function TorDetailContent() {
    const searchParams = useSearchParams();
    const id = Number(searchParams.get("id"));

    const { tor, isValidId, isPending, notFound } = useTorDetailPage(id);

    if (isValidId && isPending) {
        return (
            <div className="flex justify-center py-12">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (notFound || !tor) {
        return (
            <p className="py-12 text-center text-sm text-muted-foreground">
                ไม่พบข้อมูล TOR นี้
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4.5">
            <Card className={CARD_CLASS}>
                <CardHeader className="flex flex-col gap-2.25">
                    <div className="flex items-center gap-2.5 h-fit">
                        <p className="text-xs font-medium text-red-700">{tor.torCode}</p>
                        <TorStatusBadge status={tor.status} />
                    </div>
                    <CardTitle className="text-2xl font-semibold">
                        {tor.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Separator className="mb-4.5" />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        <SummaryItem label="หน่วยงาน">{tor.department.name}</SummaryItem>
                        <SummaryItem label="โครงการ">
                            {tor.tenderProject ? (
                                <Link
                                    href={routes.dashboards.tender_project.detail(tor.tenderProject.id)}
                                    className="underline decoration-gray-300 underline-offset-4 hover:decoration-current"
                                >
                                    {tor.tenderProject.projectCode} · {tor.tenderProject.name}
                                </Link>
                            ) : (
                                "ไม่สังกัดโครงการ"
                            )}
                        </SummaryItem>
                        <SummaryItem label="ราคากลาง">฿{formatCurrency(Number(tor.budgetEstimate))}</SummaryItem>
                        <SummaryItem label="ปีงบประมาณ">{tor.fiscalYear}</SummaryItem>
                        <SummaryItem label="วิธีจัดซื้อจัดจ้าง">{tor.procurementMethod}</SummaryItem>
                        <SummaryItem label="เปิดรับซอง">{formatTorDate(tor.biddingStartAt)}</SummaryItem>
                        <SummaryItem label="ปิดรับซอง">{formatTorDate(tor.biddingEndAt)}</SummaryItem>
                        <SummaryItem label="วันที่สร้าง">{formatTorDate(tor.createdAt)}</SummaryItem>
                    </div>
                </CardContent>
            </Card>

            <Card className={CARD_CLASS}>
                <CardHeader>
                    <CardTitle className="font-bold">ขอบเขตงาน</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-line leading-relaxed">{tor.scopeOfWork}</p>
                </CardContent>
            </Card>

            <Card className={CARD_CLASS}>
                <CardHeader>
                    <CardTitle className="font-bold">ผู้เกี่ยวข้อง</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <PersonRow label="ผู้สร้าง" person={tor.createdBy} />
                    <PersonRow
                        label="ผู้อนุมัติ"
                        person={tor.approvedBy}
                        extra={<span className="text-gray-600"> · {formatTorDate(tor.approvedAt)}</span>}
                    />
                </CardContent>
            </Card>

            {tor.remark?.trim() && (
                <Card className={CARD_CLASS}>
                    <CardHeader>
                        <CardTitle className="font-bold">หมายเหตุ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-line leading-relaxed">{tor.remark}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function TorDetailPage() {
    return (
        <Suspense fallback={null}>
            <RequirePermission permissions={TOR_VIEW_PERMISSIONS}>
                <TorDetailContent />
            </RequirePermission>
        </Suspense>
    );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint app/dashboard/tors/detail`
Expected: no errors.

- [ ] **Step 4: Stage**

```bash
git add app/dashboard/tors/detail
```

---

### Task 7: Build and manual QA handoff

**Files:** none (verification only).

- [ ] **Step 1: Full type check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors in any file touched by Tasks 1–6. (Report pre-existing errors in other files without fixing them.)

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds; the route list includes `/dashboard/tors` and `/dashboard/tors/detail`.

- [ ] **Step 3: Hand the user this manual QA checklist**

Run with `npm run dev` against a backend that has the TOR seed data, logged in as admin. Items marked † need the backend select-options work to be deployed.

1. Sidebar shows "การจัดการ TOR"; `/dashboard/tors` lists TORs with the table on `xl` and cards below it.
2. Search by part of a TOR code, then part of a title; the empty-search message appears for nonsense text.
3. Each filter alone: status, หน่วยงาน, ปีงบประมาณ, วิธีจัดซื้อจัดจ้าง, โครงการ (a specific project †, and "ไม่สังกัดโครงการ"). Results only change after "ค้นหา".
4. Two filters together; "ล้างตัวกรอง" clears all five and the search but keeps the sort.
5. Every sort option, including ปีงบประมาณ; clicking a sortable header on `xl` updates the sort Select to match.
6. Go to page 2, change a filter, submit: back to page 1 with the filter kept. Reload: filters restored from the URL.
7. Below `lg`: filter sheet opens, the badge counts active filters, typing inside the หน่วยงาน and โครงการ fields does not jump the sheet, "แสดงผล" applies.
8. Detail page from the code link and the title link: TOR with a project (project link works), without a project ("ไม่สังกัดโครงการ"), with and without an approver, with and without a remark; scope of work keeps its line breaks.
9. `/dashboard/tors/detail?id=abc` and `?id=999999` show "ไม่พบข้อมูล TOR นี้"; the breadcrumb shows "ไม่พบข้อมูล".
10. Logged in as an internal user without any `tors.*` permission: no sidebar item, and both URLs show the 403 page.
11. Logged in as a user with only `tors.viewDepartment` †: the หน่วยงาน dropdown loads, and a TOR from another department opened by URL shows "ไม่พบข้อมูล TOR นี้".

- [ ] **Step 4: Ask for commit approval**

Show the user `git status` and `git diff --cached --stat`, and ask whether to commit. Do not commit without an explicit yes.
