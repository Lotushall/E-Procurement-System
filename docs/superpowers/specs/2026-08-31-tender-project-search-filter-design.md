# Tender Projects: Search Bar + Status Filter

## Problem

`app/dashboard/tender-projects/page.tsx` has a header and stat cards but no
list UI yet — the area below the stat cards is still a literal placeholder
string (`asdw`). The user wants the search bar and status filter controls in
place now, ahead of the real data table, matching the layout every other
list page in this dashboard already has.

## Scope

Frontend only, single file (`tender-projects/page.tsx`). Display-only: the
search input and status filter hold local state but do not filter, fetch,
or gate anything yet — there is no data table to filter and no backend
status enum to filter against (`TenderProject.status` is still a free
string defaulting to `'draft'`, per the earlier stat-cards spec). No new
files, no backend changes.

## Design

Mirrors the search+filter block already duplicated three times in this
codebase (`users/page.tsx`, `vendors/page.tsx`,
`internal-employees/page.tsx`) — same components, same layout, same
declare-locally convention:

```tsx
type TenderProjectStatusFilter = "all" | "draft" | "in_progress" | "completed" | "cancelled";

const STATUS_OPTIONS: { value: TenderProjectStatusFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "draft", label: "ร่าง" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
];
```

Declared at module scope in `page.tsx`, same place `TYPE_OPTIONS`/`STATUS_OPTIONS`
live in `users/page.tsx`. Inside `TenderProjectsPageContent`: `const [search, setSearch] = useState("")`
and `const [statusFilter, setStatusFilter] = useState<TenderProjectStatusFilter>("all")` —
both unused beyond holding UI state (no filtering logic, since there is
nothing to filter yet).

Rendered in a `flex flex-col gap-3 lg:flex-row` wrapper, right after
`<TenderProjectStatsCards />` and before the existing `asdw` placeholder:
- `SearchInput` (`@/components/search-input`), `value={search} onValueChange={setSearch}`,
  `className="flex-1"`, placeholder `"ค้นหาชื่อโครงการ | รหัสโครงการ"`.
- `Select` (`@/components/ui/select`) bound to `statusFilter`/`setStatusFilter`,
  `items={STATUS_OPTIONS}`, `SelectTrigger` styled `lg:w-44 h-10! bg-white rounded-sm`
  (verbatim from `users/page.tsx`'s existing filter Select), rendering
  `STATUS_OPTIONS` as `SelectItem`s.

### Testing

No test runner or browser automation in this repo/environment (established
convention). Verification is `tsc`/lint; manual browser QA is disclosed as
pending, not performed.

## Out of scope

- Any filtering/search behavior — the controls hold state only.
- A real status enum, backend endpoint, or data table.
- Wiring this state into `TenderProjectStatsCards` or anything else on the page.
