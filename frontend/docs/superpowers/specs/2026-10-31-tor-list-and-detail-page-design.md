# TOR List and Detail Pages

## Problem

`app/dashboard/tors/page.tsx` is an empty shell. The backend TOR list and detail API
already exist (`docs/superpowers/specs/2026-10-30-tor-list-and-detail-api-design.md`
at repo root, commit `2b91ee2`), and the frontend data layer for them is in place
(`lib/tender/tor/`: `fetchTorsList`, `fetchTorDetail`, `useTorsList`, `useTorDetail`,
types, commit `a9ef458`). No page uses them yet.

## Scope

Frontend only: the TOR list page `/dashboard/tors` and the TOR detail page
`/dashboard/tors/detail?id=`.

**Depends on** the backend spec
`backend/docs/superpowers/specs/2026-10-31-select-options-internal-access-design.md`,
which adds `GET /dashboard/tender-projects/select` and opens the `/select`
endpoints to every internal user. That work is done separately, by the backend session.

Out of scope: creating, editing, deleting or changing the status of a TOR (no API);
stats cards (no API); the "TOR ที่เกี่ยวข้อง" table on the tender project detail page
(a follow-up that can reuse `useTorsList` with `tender_project_id`).

## Design

### Structure

The page follows `app/dashboard/tender-projects/`, which already uses the shared list
controls (`useListPageControls`, `ListFilterSheet`, `ListSortSelect`, `DataTable` with
`renderMobileCard`). No view wrapper: `page.tsx` holds the page and a `Suspense`
boundary for `useSearchParams`, as the tender project page does.

| File | Purpose |
|---|---|
| `lib/tender/tender-projects/api.ts` | + `fetchTenderProjectOptions()` → `GET /api/v1/dashboard/tender-projects/select` |
| `lib/tender/tender-projects/types.ts` | + `TenderProjectOption { id: number; projectCode: string; name: string }` |
| `lib/tender/tender-projects/queries/useTenderProjectOptions.ts` | new, query key `["tenders_projects", "select"]` (the tender project mutations invalidate `["tenders_projects"]`, so the options refresh after a create/edit/delete) |
| `lib/tender/procurement-methods.ts` | `PROCUREMENT_METHODS` moved here from `app/dashboard/tender-projects/_data/procurement-methods.ts` (the `_data` file is deleted; `procurement-method-combobox.tsx` imports the new path) |
| `lib/routes.ts` | + `dashboards.tors.detail(id)` → `/dashboard/tors/detail?id=${id}` |
| `lib/auth/guards/RequirePermission.tsx` | accepts `permission?: string` **or** `permissions?: string[]` (passes when the user has any of them) |
| `components/tor-status-badge.tsx` | `TOR_STATUS_STYLE`, `TOR_STATUSES`, `TorStatusBadge` |
| `app/dashboard/_components/app-sidebar.tsx` | TOR item uses the three real `tors.*` permissions (see Permissions) |
| `app/dashboard/tors/page.tsx` | list page |
| `app/dashboard/tors/_hooks/use-tor-list-page.ts` | filter state, URL sync, query |
| `app/dashboard/tors/_components/filters/tor-filter-bar.tsx` | search + `lg` filter row + mobile sheet trigger |
| `app/dashboard/tors/_components/filters/tor-filter-fields.tsx` | the five filter controls, shared by the row and the sheet |
| `app/dashboard/tors/_components/filters/tor-filter-sheet.tsx` | `ListFilterSheet` wrapper |
| `app/dashboard/tors/_components/filters/tor-sort-select.tsx` | sort Select |
| `app/dashboard/tors/_components/filters/tender-project-filter-combobox.tsx` | project combobox |
| `app/dashboard/tors/_components/table/columns.tsx` | `createColumns()` |
| `app/dashboard/tors/_components/table/tor-card.tsx` | mobile card |
| `app/dashboard/tors/_components/tor-list-skeleton.tsx` | page + table skeletons |
| `app/dashboard/tors/detail/page.tsx` | detail page |
| `app/dashboard/tors/detail/_hooks/use-tor-detail-page.ts` | id parsing, query, breadcrumb |

### Status badge

`components/tor-status-badge.tsx` mirrors `tender-project-status-badge.tsx`
(`{ label, badge, dot }` per status, returns null for an unknown status). Labels use
the terms in `CONTEXT.md`:

| Status | Label | Colour |
|---|---|---|
| `draft` | ร่าง | gray |
| `in_review` | รอพิจารณา | yellow |
| `revision_required` | ส่งกลับแก้ไข | orange |
| `approved` | อนุมัติแล้ว | sky |
| `bidding` | เปิดรับซอง | blue |
| `closed` | ปิดรับซอง | purple |
| `no_bidder` | ไม่มีผู้ยื่นข้อเสนอ | dark gray (`text-gray-700 bg-gray-500/15`) |
| `awarded` | ได้ผู้ชนะ | light green |
| `completed` | เสร็จสิ้น | dark green |
| `cancelled` | ยกเลิก | red |

`TOR_STATUSES` lists them in this order, which is also the order of the status filter.

### List page (`/dashboard/tors`)

**Header:** title "การจัดการ TOR", subtitle "ภาพรวมทั้งหมดและ TOR ที่เกี่ยวข้อง",
breadcrumb `[{ label: "การจัดการ TOR" }]`. No floating action button (no create API).

**Filters (`use-tor-list-page.ts`).** Same model as `use-tender-project-list-page.ts`:
draft state in the controls, applied state in the URL, and the query only changes on
`submitFilters()` (the "ค้นหา" button / the sheet's "แสดงผล"). `clearFilters()` resets
every filter but keeps the sort.

| Control | URL param | Values |
|---|---|---|
| Search (always visible) | `search` | trimmed text; empty → removed |
| Status | `status` | `all` (removed) or one of `TOR_STATUSES`; anything else in the URL parses as `all` |
| Department | `department_id` | positive integer from `useDepartmentOptions()`; anything else → unset |
| Fiscal year | `fiscal_year` | same control as the tender project page; parsed to a number for `TorListParams` |
| Procurement method | `procurement_method` | one of `PROCUREMENT_METHODS`, or unset |
| Project | `tender_project_id` | unset (ทั้งหมด), `none` (ไม่สังกัดโครงการ), or a positive integer |

The procurement method filter offers only the fixed `PROCUREMENT_METHODS` list. The
project form's combobox lets users type a custom method, and `TorsFactory` copies a
TOR's method from its project, so a TOR can hold a value outside the list. Such TORs
show up when no method filter is set, but cannot be picked out by this filter. This
is accepted; a backend options list of methods in use would fix it later.

`activeFilterCount` counts the five filters (not search or sort). It feeds the badge
on the mobile filter button and the empty-state message.

**Project combobox.** Built like `components/internal-profile-combobox.tsx` (Combobox
with client-side text filtering). Items: "ทุกโครงการ", "ไม่สังกัดโครงการ", then each
`TenderProjectOption` labelled `projectCode · name`. While the options are loading or
if they fail, only the first two items are shown; the page still works.

**Sort.** `SORT_BY_VALUES` = `tor_code`, `title`, `budget_estimate`, `fiscal_year`,
`bidding_end_at`. The sort Select offers "ล่าสุด" (backend default, `created_at desc`)
plus asc/desc for each of the five. The table headers for the sortable columns use
`SortableHeader`, so header clicks and the Select share one URL state, as on the
tender project page.

**Table columns (`xl`):**

| id | Header | Cell | Sortable |
|---|---|---|---|
| `tor_code` | รหัส TOR | link to `routes.dashboards.tors.detail(id)`, red text | ✓ |
| `title` | TOR / หน่วยงาน | title (link) over department name | ✓ |
| `tender_project` | โครงการ | `projectCode` linked to `routes.dashboards.tender_project.detail(id)`, `-` when null | |
| `procurement_method` | วิธีจัดซื้อจัดจ้าง | text | |
| `budget_estimate` | ราคากลาง | "ปีงบประมาณ {fiscalYear}" over `formatCurrency(Number(budgetEstimate))`, right-aligned | ✓ |
| `bidding_end_at` | ปิดรับซอง | `d MMM yyyy` (Thai locale), `-` when null | ✓ |
| `status` | สถานะ | `TorStatusBadge`, centred | |

`fiscal_year` is sortable through the Select only; it shares a cell with the budget.
There is no actions column.

**Mobile card (`tor-card.tsx`):** top row `torCode` + badge; then title (link to
detail), department, and ราคากลาง with its fiscal year; footer row วิธีจัดซื้อจัดจ้าง and
ปิดรับซอง.

**Sort Select visibility.** Unlike the tender project page, the sort Select stays
visible on `xl` as well, because `fiscal_year` has no column header to click.

**States:**

| State | Shown |
|---|---|
| `isPending` or `isFetching` | `TorTableSkeleton` |
| `isError` | "ไม่สามารถโหลดข้อมูล TOR ได้ กรุณาลองใหม่อีกครั้ง" |
| no rows, search applied | "ไม่พบ TOR ที่ตรงกับคำค้นหา" |
| no rows, filters applied | "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก" |
| no rows otherwise | "ยังไม่มี TOR ในระบบ" |

### Detail page (`/dashboard/tors/detail?id=`)

`use-tor-detail-page.ts` follows `use-tender-project-detail-page.ts`: `isValidId` is a
positive finite number; `notFound` covers an invalid id, a failed query and an empty
result; breadcrumb `การจัดการ TOR` (link to the list) → TOR title, `{ loading: true }`
while pending. A 404 from the API (missing TOR or outside the viewer's visibility)
shows "ไม่พบข้อมูล TOR นี้"; a pending query shows the centred `Spinner`.

Layout, using the same `Card` styling as the tender project detail page:

1. **Main card.** Header: `torCode` (red, small) and `TorStatusBadge`, then the title
   as `CardTitle`. Body: a grid (2 columns, `sm` 3, `lg` 4) of label/value pairs:
   หน่วยงาน · โครงการ (link to the project, or "ไม่สังกัดโครงการ") · ราคากลาง
   (`฿` + `formatCurrency`) · ปีงบประมาณ · วิธีจัดซื้อจัดจ้าง · เปิดรับซอง ·
   ปิดรับซอง · วันที่สร้าง. Dates use `d MMM yyyy` Thai; null → `-`.
2. **ขอบเขตงาน.** `scopeOfWork` with `whitespace-pre-line`.
3. **ผู้เกี่ยวข้อง.** ผู้สร้าง: name · department. ผู้อนุมัติ: name · department ·
   `approvedAt`. Any null (`createdBy`, `approvedBy`, `name`, `department`) → `-`.
4. **หมายเหตุ.** Rendered only when `remark` is non-empty, `whitespace-pre-line`.

### Permissions

`TOR_VIEW_PERMISSIONS = ["tors.viewAny", "tors.viewDepartment", "tors.viewOwn"]`,
exported from `lib/tender/tor/types.ts`.

- Both pages wrap their content in
  `<RequirePermission permissions={TOR_VIEW_PERMISSIONS}>`, which shows `<Forbidden />`
  when the user has none of them. The backend enforces the same rule and returns 403.
- `RequirePermission` keeps its `permission` prop, so existing callers do not change.
  Passing neither prop is a type error (a discriminated union of the two props).
- Sidebar: `NavItem.permission?: string` becomes `permissions?: string[]` (visible when
  the user has any of them; the existing "`role` also satisfies" rule is unchanged).
  The TOR item drops the nonexistent `tor.view` and its `role: "admin"` fallback and
  uses `permissions: TOR_VIEW_PERMISSIONS`. No other nav item uses `permission` today.

### Error handling

| Case | Result |
|---|---|
| User has none of the three permissions | `<Forbidden />` on both pages; TOR item hidden in the sidebar |
| List request fails | error message in place of the table |
| Detail: invalid id, 404, or failed request | "ไม่พบข้อมูล TOR นี้" |
| Department or project options fail to load | the dropdown shows only its fixed items; filtering by the others still works |

## Testing

The frontend has no page-level test suite and this environment has no browser
automation. Verification is `npx tsc --noEmit`, `npm run lint` and `npm run build`,
plus a manual QA checklist in the plan, run by the user:

- each filter alone, combined, cleared; the `none` project option
- every sort option, and a header click staying in sync with the sort Select
- pagination keeps the filters
- the mobile card layout and the filter sheet below `xl`/`lg`
- the detail page for a TOR with and without a project, approver and remark
- detail page with `?id=abc`, `?id=999999`, and a TOR outside the viewer's visibility
- a user without TOR permissions: no sidebar item, `<Forbidden />` on both URLs
