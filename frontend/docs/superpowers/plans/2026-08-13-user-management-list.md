# User Management List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin "จัดการผู้ใช้" (User Management) list page (search/filter across all user types) and a read-only user detail page, plus bidirectional navigation between a user's account and their vendor profile — the first of 4 sub-projects for this feature (status-change, create-user, and role/permission management are separate future plans).

**Architecture:** New `lib/user/management/` data module (types, axios API client, React Query read hooks) consumed by a new `app/dashboard/users/` list page and `app/dashboard/users/detail/` page, both built by mirroring the existing `app/dashboard/vendors/` list/detail pattern as closely as possible. The shared generic `DataTable` component is promoted from the vendor feature's private folder to `components/ui/` so both features can use it without reaching into each other's private `_components/`. Two small additive edits connect this to the existing Vendor detail page.

**Tech Stack:** Next.js (App Router, client components), TypeScript, `@tanstack/react-query` v5, `@tanstack/react-table` v8, `date-fns`, shadcn/ui (`@base-ui/react` primitives) — no backend changes in this plan, no test runner in this repo (manual QA only, verified via `tsc`/`lint`).

## Global Constraints

- The backend API this plan assumes (`docs/superpowers/specs/2026-08-13-user-management-list-design.md`) does not exist yet — it's a separate backend plan. Every task must leave the UI in a working, non-crashing state on request failure (loading/error states), matching the existing Vendor list's pattern exactly.
- The user list covers **all** user types (internal/company/individual) in one table with a type filter AND a status filter (two independent `Select` dropdowns) — no stats-cards (unlike the Vendor list), because two simultaneous filter dimensions don't map cleanly onto a single set of clickable count-cards.
- Sorting is limited to exactly `created_at`, `username`, `email` — never `name` (server-resolved across different tables depending on user type, not sortable) or `user_type`/`status`.
- The user list's "ผู้ใช้" (name) column shows an avatar-initials + resolved `name` + `username` — but is **not** sortable itself (only `email` and `created_at` columns get a `SortableHeader`).
- The user detail page is **read-only** — no edit/status-change/delete buttons anywhere in this plan.
- Every row in the user list has a "view detail" action (not just vendor-type rows) — the vendor-specific link lives on the detail page, not the list.
- Cross-linking is bidirectional: User detail page → Vendor detail page (only when `vendorProfileId !== null`, i.e. `userType` is `company`/`individual`); Vendor detail page (existing page) → User detail page (always — every vendor has a user account).
- No automated test runner in this repo — every task's verification step is `npx tsc --noEmit` (compare against the pre-existing baseline below) plus `npm run lint`; the two page-assembly tasks additionally get a manual-QA checklist.
- Pre-existing `tsc` baseline (do not try to fix, must not grow): 6 errors, all in `lib/auth/permissions.ts:30,35,40,45,50,55` (`CurrentUser` vs `User` type mismatch, unrelated to this feature).
- Existing uncommitted WIP this plan builds on/replaces: `app/dashboard/_components/app-sidebar.tsx` already has a "จัดการผู้ใช้" nav item pointing at `routes.dashboards.user.index`; `lib/routes.ts` already has `dashboards.user.index = "/dashboard/users"` (plus a dead `import { Users } from "lucide-react"` at the top of that file — remove it as part of Task 5, the first task that touches this file); `app/dashboard/users/page.tsx` is currently an empty placeholder — Task 6 replaces it entirely.

---

### Task 1: User management types + API client

**Files:**
- Create: `lib/user/management/types.ts`
- Create: `lib/user/management/api.ts`

**Interfaces:**
- Produces: `UserType`, `UserStatus`, `UserSortBy`, `UserSortDirection`, `UserListItem`, `UserDetail`, `UserListPagination`, `PaginatedUserList` (types.ts); `fetchUserList(type?, status?, search?, page?, perPage?, sortBy?, sortDirection?)`, `fetchUserDetail(id)` (api.ts). Consumed by Tasks 2, 5, 6, 7.

- [ ] **Step 1: Create `lib/user/management/types.ts`**

```ts
export type UserType = "internal" | "company" | "individual";
export type UserStatus = "pending" | "active" | "suspended" | "inactive";
export type UserSortBy = "created_at" | "username" | "email";
export type UserSortDirection = "asc" | "desc";

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  name: string;
  userType: UserType;
  status: UserStatus;
  createdAt: string;
}

export interface UserDetail extends UserListItem {
  vendorProfileId: number | null;
}

export interface UserListPagination {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface PaginatedUserList {
  data: UserListItem[];
  meta: UserListPagination;
}
```

- [ ] **Step 2: Create `lib/user/management/api.ts`**

```ts
import { api } from "@/lib/api";
import type {
  PaginatedUserList,
  UserDetail,
  UserSortBy,
  UserSortDirection,
  UserStatus,
  UserType,
} from "@/lib/user/management/types";

export async function fetchUserList(
  type?: UserType,
  status?: UserStatus,
  search?: string,
  page = 1,
  perPage = 20,
  sortBy?: UserSortBy,
  sortDirection?: UserSortDirection,
): Promise<PaginatedUserList> {
  const { data } = await api.get<PaginatedUserList>("/api/v1/dashboard/users", {
    params: {
      type,
      status,
      search,
      page,
      per_page: perPage,
      sort_by: sortBy,
      sort_direction: sortDirection,
    },
  });
  return data;
}

export async function fetchUserDetail(id: number): Promise<UserDetail> {
  const { data } = await api.get<{ data: UserDetail }>(`/api/v1/dashboard/users/${id}`);
  return data.data;
}
```

- [ ] **Step 3: Run `tsc` to confirm no new errors**

Run from `frontend/`: `npx tsc --noEmit`

Expected: only the 6 pre-existing `lib/auth/permissions.ts` errors from Global Constraints — nothing new. These 2 new files have no consumers yet.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add lib/user/management/types.ts lib/user/management/api.ts
git commit -m "feat(user): add user management types and API client"
```

---

### Task 2: User list/detail read hooks

**Files:**
- Create: `lib/user/management/queries/useUserList.ts`
- Create: `lib/user/management/queries/useUserDetail.ts`

**Interfaces:**
- Consumes: `fetchUserList`, `fetchUserDetail` (Task 1 `api.ts`); `UserType`, `UserStatus`, `UserSortBy`, `UserSortDirection` (Task 1 `types.ts`).
- Produces: `useUserList(type?, status?, search?, page?, perPage?, sortBy?, sortDirection?)` → `UseQueryResult<PaginatedUserList>`; `useUserDetail(id: number)` → `UseQueryResult<UserDetail>`. Consumed by Tasks 5 and 7.

- [ ] **Step 1: Create `lib/user/management/queries/useUserList.ts`**

```ts
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchUserList } from "@/lib/user/management/api";
import type {
  UserSortBy,
  UserSortDirection,
  UserStatus,
  UserType,
} from "@/lib/user/management/types";

export function useUserList(
  type?: UserType,
  status?: UserStatus,
  search?: string,
  page = 1,
  perPage = 20,
  sortBy?: UserSortBy,
  sortDirection?: UserSortDirection,
) {
  return useQuery({
    queryKey: [
      "users",
      "list",
      type ?? "all",
      status ?? "all",
      search ?? "",
      page,
      perPage,
      sortBy ?? "",
      sortDirection ?? "",
    ],
    queryFn: () => fetchUserList(type, status, search, page, perPage, sortBy, sortDirection),
    placeholderData: keepPreviousData,
  });
}
```

This mirrors `lib/vendor/approval/queries/useVendorList.ts`'s queryKey/`keepPreviousData` shape exactly.

- [ ] **Step 2: Create `lib/user/management/queries/useUserDetail.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchUserDetail } from "@/lib/user/management/api";

export function useUserDetail(id: number) {
  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: () => fetchUserDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
```

This mirrors `lib/vendor/approval/queries/useVendorDetail.ts` exactly (same `enabled` guard, no extra options).

- [ ] **Step 3: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add lib/user/management/queries/useUserList.ts lib/user/management/queries/useUserDetail.ts
git commit -m "feat(user): add user list and detail read hooks"
```

---

### Task 3: `UserStatusBadge` component

**Files:**
- Create: `components/user-status-badge.tsx`

**Interfaces:**
- Produces: `UserStatusBadge({ status, className? }: { status: string; className?: string })`. Consumed by Tasks 5 (table column) and 7 (detail page).

- [ ] **Step 1: Create `components/user-status-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  active: { label: "ใช้งานอยู่", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  suspended: { label: "ระงับการใช้งาน", badge: "text-orange-600 bg-orange-400/15", dot: "bg-orange-600" },
  inactive: { label: "ปิดใช้งาน", badge: "text-gray-600 bg-gray-400/15", dot: "bg-gray-500" },
};

export function UserStatusBadge({
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

This is a direct structural copy of `components/vendor-status-badge.tsx` with a different status→style map (4 states instead of 3, matching `UserStatus`).

- [ ] **Step 2: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new. (Not yet rendered anywhere — visual verification happens in Tasks 6/7.)

- [ ] **Step 3: Commit**

```bash
cd frontend
git add components/user-status-badge.tsx
git commit -m "feat(user): add UserStatusBadge component"
```

---

### Task 4: Move `DataTable` to a shared location

**Files:**
- Create: `components/ui/data-table.tsx`
- Delete: `app/dashboard/vendors/_components/table/data-table.tsx`
- Modify: `app/dashboard/vendors/page.tsx`

**Interfaces:**
- Produces: `DataTable<TData, TValue>` (same generic component, same props) now importable from `@/components/ui/data-table`. Consumed by Task 6 (Users list page) and by the existing Vendor list page (import path only change, no behavior change).

This is a pure relocation — `DataTablePagination` and `SortableHeader` (its siblings) already live in `components/ui/`, and this task builds a second consumer of `DataTable`, so it belongs there too instead of being reached into across route-group private folders.

- [ ] **Step 1: Create `components/ui/data-table.tsx` with the exact current content of the file being moved**

```tsx
"use client"

import {
    ColumnDef,
    OnChangeFn,
    PaginationState,
    SortingState,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    pageCount: number
    total: number
    pagination: PaginationState
    onPaginationChange: OnChangeFn<PaginationState>
    sorting: SortingState
    onSortingChange: OnChangeFn<SortingState>
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pageCount,
    total,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data,
        columns,
        pageCount,
        state: { pagination, sorting },
        onPaginationChange,
        onSortingChange,
        manualPagination: true,
        manualSorting: true,
        enableMultiSort: false,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border shadow-md">
                <Table className="">
                    <TableHeader className="bg-[#F7F8FA]">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="px-4 py-3 font-bold text-gray-600 tracking-wide">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="even:bg-[#F7F8FA] odd:bg-white"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="px-4 py-3 text-gray-700">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table} total={total} />
        </div>
    )
}
```

- [ ] **Step 2: Delete the old file**

```bash
cd frontend
git rm app/dashboard/vendors/_components/table/data-table.tsx
```

- [ ] **Step 3: Update the Vendor list page's import**

In `app/dashboard/vendors/page.tsx`, find:

```tsx
import { DataTable } from "./_components/table/data-table";
```

Replace with:

```tsx
import { DataTable } from "@/components/ui/data-table";
```

- [ ] **Step 4: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new — confirms nothing else in the codebase imported the old path (a broken import would show up as a new error here).

- [ ] **Step 5: Run lint**

Run from `frontend/`: `npm run lint`

Expected: no new errors/warnings from either changed file.

- [ ] **Step 6: Manual verification**

1. Start the dev server if not already running: `npm run dev`.
2. Log in as admin (`admin@example.com` / `password`), go to the vendor list (`/dashboard/vendors`).
3. Confirm the table renders exactly as before this change — same columns, pagination, sorting all still work. (Pure file move + import path change — nothing here should look or behave differently.)

- [ ] **Step 7: Commit**

```bash
cd frontend
git add components/ui/data-table.tsx app/dashboard/vendors/page.tsx
git commit -m "refactor(ui): move DataTable to shared components/ui location"
```

---

### Task 5: Users list supporting pieces (routes, hook, columns, skeleton)

**Files:**
- Modify: `lib/routes.ts`
- Create: `app/dashboard/users/_hooks/use-user-list-page.ts`
- Create: `app/dashboard/users/_components/table/columns.tsx`
- Create: `app/dashboard/users/_components/user-list-skeleton.tsx`

**Interfaces:**
- Consumes: `useUserList` (Task 2); `UserListItem`, `UserType`, `UserSortBy`, `UserSortDirection` (Task 1); `UserStatusBadge` (Task 3); `routes.dashboards.user.detail` (this task, Step 1).
- Produces: `routes.dashboards.user.detail(id)` (routes.ts); `useUserListPage()` returning `{ typeFilter, setTypeFilter, statusFilter, setStatusFilter, search, setSearch, debouncedSearch, visible, pageCount, total, pagination, setPagination, sorting, setSorting, isPending, isFetching, isError }`, plus exported types `UserTypeFilter = "all" | UserType` and `UserStatusFilter = "all" | UserStatus`; `columns: ColumnDef<UserListItem>[]`; `UserListSkeleton`, `UserTableSkeleton` components. All consumed by Task 6 (page.tsx).

- [ ] **Step 1: Add `detail` route factory to `lib/routes.ts` and remove the dead import**

Find:

```ts
import { Users } from "lucide-react";
export const routes = {
```

Replace with:

```ts
export const routes = {
```

Then find:

```ts
    user: {
      index: "/dashboard/users",
    },
```

Replace with:

```ts
    user: {
      index: "/dashboard/users",
      detail: (id: number | string) => `/dashboard/users/detail?id=${id}`,
    },
```

- [ ] **Step 2: Create `app/dashboard/users/_hooks/use-user-list-page.ts`**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import { useUserList } from "@/lib/user/management/queries/useUserList";
import type { UserSortBy, UserSortDirection, UserStatus, UserType } from "@/lib/user/management/types";

export type UserTypeFilter = "all" | UserType;
export type UserStatusFilter = "all" | UserStatus;

const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_PAGE_SIZE = 20;

const TYPE_VALUES: UserTypeFilter[] = ["all", "internal", "company", "individual"];
const STATUS_VALUES: UserStatusFilter[] = ["all", "pending", "active", "suspended", "inactive"];
const SORT_BY_VALUES: UserSortBy[] = ["created_at", "username", "email"];

function parseTypeFilter(value: string | null): UserTypeFilter {
  return TYPE_VALUES.includes(value as UserTypeFilter) ? (value as UserTypeFilter) : "all";
}

function parseStatusFilter(value: string | null): UserStatusFilter {
  return STATUS_VALUES.includes(value as UserStatusFilter) ? (value as UserStatusFilter) : "all";
}

function parseSortBy(value: string | null): UserSortBy | undefined {
  return SORT_BY_VALUES.includes(value as UserSortBy) ? (value as UserSortBy) : undefined;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function useUserListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const typeFilter = parseTypeFilter(searchParams.get("type"));
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const debouncedSearch = searchParams.get("search") ?? "";
  const pageIndex = parsePositiveInt(searchParams.get("page"), 1) - 1;
  const pageSize = parsePositiveInt(searchParams.get("per_page"), DEFAULT_PAGE_SIZE);
  const sortBy = parseSortBy(searchParams.get("sort_by"));
  const sortDirection: UserSortDirection | undefined = sortBy
    ? (searchParams.get("sort_direction") === "asc" ? "asc" : "desc")
    : undefined;

  const [search, setSearch] = useState(debouncedSearch);
  const [skipSkeleton, setSkipSkeleton] = useState(false);

  const updateParams = useCallback(
    (updates: Record<string, string | number | null>, resetPage = false) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      if (resetPage) params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const normalized = search.trim();
    if (normalized === debouncedSearch) return;
    const timeout = setTimeout(() => {
      setSkipSkeleton(false);
      updateParams({ search: normalized || null }, true);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, debouncedSearch, updateParams]);

  const setTypeFilter = (next: UserTypeFilter) => {
    setSkipSkeleton(false);
    updateParams({ type: next === "all" ? null : next }, true);
  };

  const setStatusFilter = (next: UserStatusFilter) => {
    setSkipSkeleton(false);
    updateParams({ status: next === "all" ? null : next }, true);
  };

  const pagination: PaginationState = { pageIndex, pageSize };

  const setPagination: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setSkipSkeleton(true);
    updateParams({
      page: next.pageIndex === 0 ? null : next.pageIndex + 1,
      per_page: next.pageSize === DEFAULT_PAGE_SIZE ? null : next.pageSize,
    });
  };

  const sorting: SortingState = sortBy ? [{ id: sortBy, desc: sortDirection === "desc" }] : [];

  const setSorting: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const nextSort = next[0];
    setSkipSkeleton(true);
    updateParams(
      {
        sort_by: nextSort ? nextSort.id : null,
        sort_direction: nextSort ? (nextSort.desc ? "desc" : "asc") : null,
      },
      true,
    );
  };

  const list = useUserList(
    typeFilter === "all" ? undefined : typeFilter,
    statusFilter === "all" ? undefined : statusFilter,
    debouncedSearch || undefined,
    pageIndex + 1,
    pageSize,
    sortBy,
    sortDirection,
  );

  const isFetching = list.isFetching && !skipSkeleton;

  return {
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    debouncedSearch,
    visible: list.data?.data ?? [],
    pageCount: list.data?.meta.lastPage ?? 0,
    total: list.data?.meta.total ?? 0,
    pagination,
    setPagination,
    sorting,
    setSorting,
    isPending: list.isPending,
    isFetching,
    isError: list.isError,
  };
}
```

This mirrors `app/dashboard/vendors/_hooks/use-vendor-list-page.ts` exactly, except: two filter dimensions (`type` + `status`) instead of one, and no phone-number search normalization (that was vendor-specific, not applicable to username/email/name search).

- [ ] **Step 3: Create `app/dashboard/users/_components/table/columns.tsx`**

```tsx
"use client"

import Link from "next/link"
import { format } from "date-fns"
import { Building2, Eye, Store, UserRound, type LucideIcon } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { UserListItem, UserType } from "@/lib/user/management/types"
import { Button } from "@/components/ui/button"
import { SortableHeader } from "@/components/ui/data-table-sortable-header"
import { UserStatusBadge } from "@/components/user-status-badge"
import { routes } from "@/lib/routes"
import { getInitials } from "@/lib/utils"

const USER_TYPE_LABEL: Record<UserType, string> = {
    internal: "พนักงานภายใน",
    company: "นิติบุคคล",
    individual: "ร้านค้า",
}

const USER_TYPE_ICON: Record<UserType, LucideIcon> = {
    internal: UserRound,
    company: Building2,
    individual: Store,
}

export const columns: ColumnDef<UserListItem>[] = [
    {
        id: "name",
        header: "ผู้ใช้",
        enableSorting: false,
        accessorFn: (user) => user.name,
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8.5 rounded-md bg-red-700 text-white text-xs font-bold tracking-wider">
                    {getInitials(row.original.name)}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold">{row.original.name}</span>
                    <span className="text-xs text-muted-foreground">{row.original.username}</span>
                </div>
            </div>
        ),
    },
    {
        id: "user_type",
        header: "ประเภท",
        enableSorting: false,
        accessorFn: (user) => user.userType,
        cell: ({ getValue }) => {
            const type = getValue<UserType>()
            const Icon = USER_TYPE_ICON[type]
            return (
                <div className="flex items-center gap-1.5 text-gray-700">
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{USER_TYPE_LABEL[type]}</span>
                </div>
            )
        },
    },
    {
        id: "email",
        header: ({ column }) => <SortableHeader column={column} label="อีเมล" />,
        accessorFn: (user) => user.email,
        cell: ({ getValue }) => getValue<string>(),
    },
    {
        id: "status",
        header: () => <div className="text-center">สถานะ</div>,
        enableSorting: false,
        accessorFn: (user) => user.status,
        cell: ({ getValue }) => (
            <div className="flex justify-center">
                <UserStatusBadge status={getValue<string>()} />
            </div>
        ),
    },
    {
        id: "created_at",
        header: ({ column }) => <SortableHeader column={column} label="วันที่สร้าง" align="center" />,
        accessorFn: (user) => user.createdAt,
        cell: ({ getValue }) => (
            <div className="text-center">{format(new Date(getValue<string>()), "dd-MM-yyyy")}</div>
        ),
    },
    {
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-center">
                <Button
                    variant="outline"
                    render={<Link href={routes.dashboards.user.detail(row.original.id)} />}
                    className="size-8 px-1.5 pt-px rounded-md bg-white"
                >
                    <Eye className="w-4 h-4 text-gray-500" />
                </Button>
            </div>
        ),
    },
]
```

Note `id`/`user_type`/`status` all have `enableSorting: false` — only `email` and `created_at` are sortable, matching the Global Constraints (`sort_by` only supports `created_at`/`username`/`email`, and there's no dedicated `username` column to attach a sort arrow to, so the two visible sortable columns are `email` and `created_at`).

- [ ] **Step 4: Create `app/dashboard/users/_components/user-list-skeleton.tsx`**

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
const COLUMN_WIDTHS = ["w-20", "w-28", "w-16", "w-16", "w-16"];

export function UserTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border shadow-md">
      <Table>
        <TableHeader className="bg-[#F7F8FA]">
          <TableRow>
            <TableHead className="px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </TableHead>
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
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8.5 shrink-0 rounded-md" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto h-4 w-16" />
              </TableCell>
              <TableCell className="px-4 py-3">
                <Skeleton className="mx-auto size-8 rounded-md" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function UserListSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <UserTableSkeleton />
    </div>
  );
}
```

Unlike `VendorListSkeleton`, there's no stats-cards grid section here (this feature has no stats cards per Global Constraints).

- [ ] **Step 5: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add lib/routes.ts app/dashboard/users/_hooks/use-user-list-page.ts app/dashboard/users/_components/table/columns.tsx app/dashboard/users/_components/user-list-skeleton.tsx
git commit -m "feat(user): add users list route, page hook, table columns, and skeleton"
```

---

### Task 6: Users list page (`app/dashboard/users/page.tsx`)

**Files:**
- Modify: `app/dashboard/users/page.tsx` (replaces the existing empty placeholder entirely)

**Interfaces:**
- Consumes: `useUserListPage`, `UserTypeFilter`, `UserStatusFilter` (Task 5 hook); `columns` (Task 5); `UserListSkeleton`, `UserTableSkeleton` (Task 5); `DataTable` (Task 4, now at `@/components/ui/data-table`).

- [ ] **Step 1: Replace the contents of `app/dashboard/users/page.tsx`**

The current file is:

```tsx

export default function UsersPage() {
    return (
        <div>
            UsersPage
        </div>
    )
}
```

Replace the entire file with:

```tsx
"use client";

import { Suspense } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useUserListPage, type UserStatusFilter, type UserTypeFilter } from "./_hooks/use-user-list-page";
import { UserListSkeleton, UserTableSkeleton } from "./_components/user-list-skeleton";
import { columns } from "./_components/table/columns";

const TYPE_OPTIONS: { value: UserTypeFilter; label: string }[] = [
  { value: "all", label: "ทุกประเภท" },
  { value: "internal", label: "พนักงานภายใน" },
  { value: "company", label: "นิติบุคคล" },
  { value: "individual", label: "ร้านค้า" },
];

const STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "active", label: "ใช้งานอยู่" },
  { value: "suspended", label: "ระงับการใช้งาน" },
  { value: "inactive", label: "ปิดใช้งาน" },
];

export default function UsersPage() {
  return (
    <Suspense fallback={<UserListSkeleton />}>
      <UsersPageContent />
    </Suspense>
  );
}

function UsersPageContent() {
  useBreadcrumb([{ label: "จัดการผู้ใช้" }]);

  const {
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    debouncedSearch,
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
  } = useUserListPage();

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
        <p className="text-sm text-gray-600 tracking-wide">
          รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า
        </p>
      </div>

      {isPending ? (
        <UserListSkeleton />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ | username | อีเมล"
              className="bg-white h-10 rounded-sm"
            />

            <Select
              items={TYPE_OPTIONS}
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as UserTypeFilter)}
            >
              <SelectTrigger className="sm:w-44 h-10! bg-white rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" alignItemWithTrigger={false}>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={STATUS_OPTIONS}
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as UserStatusFilter)}
            >
              <SelectTrigger className="sm:w-44 h-10! bg-white rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" alignItemWithTrigger={false}>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isError ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง
            </p>
          ) : isFetching ? (
            <UserTableSkeleton />
          ) : visible.length > 0 ? (
            <DataTable
              columns={columns}
              data={visible}
              pageCount={pageCount}
              total={total}
              pagination={pagination}
              onPaginationChange={setPagination}
              sorting={sorting}
              onSortingChange={setSorting}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {debouncedSearch
                ? "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา"
                : typeFilter !== "all" || statusFilter !== "all"
                  ? "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไขที่เลือก"
                  : "ยังไม่มีผู้ใช้ในระบบ"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 3: Run lint**

Run from `frontend/`: `npm run lint`

Expected: no new errors/warnings from this file.

- [ ] **Step 4: Manual verification**

The backend API may not exist yet (see Global Constraints) — this step verifies the page doesn't crash either way.

1. Start the dev server if not already running: `npm run dev`.
2. Log in as admin (`admin@example.com` / `password`), navigate to `/dashboard/users` (via the sidebar "จัดการผู้ใช้" item, already wired from prior WIP).
3. **If the backend endpoint doesn't exist yet:** confirm the page shows "ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง" — it must not crash or show a blank white screen.
4. **If the backend endpoint exists and returns data:** confirm the table renders (avatar/name/username, type icon+label, email, status badge, created date), the two `Select` filters and search box all update the URL and refetch correctly, sorting on อีเมล/วันที่สร้าง works, and pagination works.
5. Check both light and dark mode.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add app/dashboard/users/page.tsx
git commit -m "feat(user): build the users list page"
```

---

### Task 7: User detail page (`app/dashboard/users/detail/page.tsx`)

**Files:**
- Create: `app/dashboard/users/detail/page.tsx`

**Interfaces:**
- Consumes: `useUserDetail` (Task 2); `UserStatusBadge` (Task 3); `routes.dashboards.user.index`, `routes.dashboards.vendors.detail` (existing), `routes.dashboards.user.detail` (Task 5).

- [ ] **Step 1: Create `app/dashboard/users/detail/page.tsx`**

```tsx
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserStatusBadge } from "@/components/user-status-badge";
import { useUserDetail } from "@/lib/user/management/queries/useUserDetail";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { getInitials } from "@/lib/utils";

const USER_TYPE_LABEL: Record<"internal" | "company" | "individual", string> = {
  internal: "พนักงานภายใน",
  company: "นิติบุคคล",
  individual: "ร้านค้า",
};

export default function UserDetailPage() {
  return (
    <Suspense fallback={null}>
      <UserDetailContent />
    </Suspense>
  );
}

function UserDetailContent() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("id"));
  const isValidId = Number.isFinite(userId) && userId > 0;

  const { data: user, isPending, isError } = useUserDetail(userId);
  const notFound = !isValidId || (isError && !user) || (!isPending && !user);

  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    isValidId && isPending ? { loading: true } : { label: user?.name ?? "ไม่พบข้อมูล" },
  ]);

  if (isValidId && isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลผู้ใช้รายนี้
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-bold text-white">
            {getInitials(user.name)}
          </div>

          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.username} · {user.email}
            </p>
          </div>

          <UserStatusBadge status={user.status} />
        </div>

        {user.vendorProfileId !== null && (
          <Button
            type="button"
            variant="outline"
            render={<Link href={routes.dashboards.vendors.detail(user.vendorProfileId)} />}
          >
            ดูข้อมูลผู้ค้า
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ประเภทผู้ใช้</span>
          <span className="text-sm font-medium">{USER_TYPE_LABEL[user.userType]}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">วันที่สร้างบัญชี</span>
          <span className="text-sm font-medium">{format(new Date(user.createdAt), "dd-MM-yyyy")}</span>
        </div>
      </div>
    </div>
  );
}
```

This mirrors `app/dashboard/vendors/detail/page.tsx`'s structure (Suspense wrap, loading spinner, not-found message, avatar-initials header) but is entirely read-only — no action buttons, no mutation hooks, no dialogs. `USER_TYPE_LABEL` is a local copy (small, 3-entry map) rather than importing the one from `_components/table/columns.tsx`, since that file lives in a route-private `_components` folder that's a poor place for a second consumer to reach into — matching the same principle Task 4 already applied to `DataTable`.

- [ ] **Step 2: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 3: Run lint**

Run from `frontend/`: `npm run lint`

Expected: no new errors/warnings from this file.

- [ ] **Step 4: Manual verification**

1. Start the dev server if not already running: `npm run dev`.
2. **If the backend endpoint exists:** from `/dashboard/users`, click the view-detail action on an internal-type row → confirm the detail page shows name/username/email/type/status/created date, and does **not** show a "ดูข้อมูลผู้ค้า" button.
3. Click the view-detail action on a company or individual-type row → confirm the "ดูข้อมูลผู้ค้า" button appears and navigates to the correct vendor's detail page (verify the vendor shown is actually the one tied to that user, not just any vendor — check the vendor's name/email matches).
4. Navigate directly to `/dashboard/users/detail?id=999999` (a non-existent id) → confirm "ไม่พบข้อมูลผู้ใช้รายนี้" shows, no crash.
5. **If the backend endpoint doesn't exist yet:** confirm step 4's not-found path still renders correctly for any id (proves the error path doesn't crash even without a working detail endpoint).
6. Check both light and dark mode.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add app/dashboard/users/detail/page.tsx
git commit -m "feat(user): add read-only user detail page"
```

---

### Task 8: Vendor detail → User detail cross-link

**Files:**
- Modify: `lib/vendor/approval/types.ts`
- Modify: `app/dashboard/vendors/detail/page.tsx`

**Interfaces:**
- Consumes: `routes.dashboards.user.detail` (Task 5).
- Produces: `VendorDetail.user` now includes `id`, consumed by the existing `useVendorDetailPage`/`useVendorDetail` chain automatically (no changes needed there — they already pass `vendor.user` through untouched).

This is the only task modifying already-shared, existing files (`app/dashboard/vendors/detail/page.tsx` is rendered for every admin viewing any vendor) — precision matters, the "Find" blocks below must match the current file content exactly.

- [ ] **Step 1: Widen the `user` field type in `lib/vendor/approval/types.ts`**

Find:

```ts
export interface VendorDetail extends VendorProfile {
  user: Pick<User, "username" | "email">;
}
```

Replace with:

```ts
export interface VendorDetail extends VendorProfile {
  user: Pick<User, "id" | "username" | "email">;
}
```

- [ ] **Step 2: Add the `Link` and `routes` imports to `app/dashboard/vendors/detail/page.tsx`**

Find:

```tsx
"use client";

import { Suspense } from "react";
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
import { cn, formatPhone, getInitials } from "@/lib/utils";
```

Replace with:

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

- [ ] **Step 3: Add the "ดูบัญชีผู้ใช้" link next to the vendor's email**

Find:

```tsx
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{vendor.user?.email}</p>
          </div>
```

Replace with:

```tsx
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">
              {vendor.user?.email}
              {vendor.user?.id && (
                <Link
                  href={routes.dashboards.user.detail(vendor.user.id)}
                  className="ml-2 text-red-700 hover:underline"
                >
                  ดูบัญชีผู้ใช้
                </Link>
              )}
            </p>
          </div>
```

`vendor.user?.id` guards against the backend not yet returning `id` (until the corresponding backend plan adds it to `VendorProfileResource`) — the link simply doesn't render rather than pointing at `/dashboard/users/detail?id=undefined`.

- [ ] **Step 4: Run `tsc`**

Run from `frontend/`: `npx tsc --noEmit`

Expected: same 6 pre-existing baseline errors, nothing new.

- [ ] **Step 5: Run lint**

Run from `frontend/`: `npm run lint`

Expected: no new errors/warnings from either changed file.

- [ ] **Step 6: Manual verification**

1. Start the dev server if not already running: `npm run dev`.
2. Log in as admin, open any vendor's detail page (`/dashboard/vendors`, click any row).
3. **If the backend hasn't added `user.id` to `VendorProfileResource` yet:** confirm the page renders exactly as before — email shown, no "ดูบัญชีผู้ใช้" link, no crash, no `undefined` in the URL anywhere.
4. **If the backend has added `user.id`:** confirm "ดูบัญชีผู้ใช้" appears next to the email, and clicking it navigates to `/dashboard/users/detail?id=<that vendor's actual user id>` showing the matching account.
5. Check both light and dark mode.

- [ ] **Step 7: Commit**

```bash
cd frontend
git add lib/vendor/approval/types.ts app/dashboard/vendors/detail/page.tsx
git commit -m "feat(user): link from vendor detail to the vendor's user account"
```
