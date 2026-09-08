# Tender Project Create Dialog Design

## Goal

Give internal staff a way to create a tender project from
`/dashboard/tender-projects`, as a popup dialog (not a separate page),
calling the already-implemented backend endpoint.

## Background

The "สร้างโครงการใหม่" button in
`app/dashboard/tender-projects/page.tsx` currently links to
`routes.dashboards.tender_project.create`, which does not exist in
`lib/routes.ts` (only `.index`, `.detail`, `.edit` are defined) — this is
a live `tsc` error (`Property 'create' does not exist...`) right now. This
spec replaces that dead link with a self-contained dialog component,
following the same "trigger + Dialog owned by one component" shape as
`edit-department-dialog.tsx`.

Backend already ships `POST /api/v1/dashboard/tender-projects`
(`backend/docs/superpowers/specs/2026-09-01-tender-project-create-design.md`):
validates via `StoreTenderProjectRequest`, auto-generates `project_code`
(`TP-{fiscalYear}-{0001}`), always creates with `status: draft`, guarded by
`can:tender-projects.store` middleware. That backend plan explicitly
scoped the frontend form out ("Frontend form/หน้า create — รอ task ถัดไป")
— this spec closes that gap, frontend-only.

## Form fields

Matches `StoreTenderProjectRequest::rules()` exactly (camelCase field
names — this project's `config/data.php` has `name_mapping_strategy: null`,
confirmed by the backend design doc):

| Field | Rule | Control |
|---|---|---|
| `name` | required, string, max 255 | `Input` |
| `description` | nullable, string | `Textarea` |
| `budget` | required, numeric, ≥ 0 | `Input type="number" step="0.01" min="0"` |
| `departmentId` | required, must exist | `DepartmentSelect` (existing) + `useDepartmentOptions()` (existing) |
| `personInChargeId` | nullable, must exist | `InternalProfileCombobox` (new — see below) |
| `procurementMethod` | required, string, max 255 | `ProcurementMethodCombobox` (new — see below) |
| `fiscalYear` | required, integer | Plain `Select`, Buddhist year, current+1 down 5 years, default = current+1 |
| `projectStartAt` | nullable, date | Popover + `Calendar mode="range"` (duplicated from the existing filter bar in `page.tsx`) |
| `projectEndAt` | nullable, date, ≥ `projectStartAt` | same range picker as above |

Layout: `Dialog` with `sm:max-w-2xl`, fields in a `grid gap-4 md:grid-cols-2`
(matching `create-internal-user-fields.tsx`'s grid convention). Column
spans, top to bottom:
- `name` — full width (`cols={2}`)
- `description` — full width (`cols={2}`)
- `budget` + `departmentId` — paired, one column each
- `personInChargeId` + `procurementMethod` — paired, one column each
- `fiscalYear` — one column (paired with nothing; renders alone in its row)
- project date range — full width (`cols={2}`), since it renders two dates
  side by side inside one `Popover` trigger button

## New component: `InternalProfileCombobox`

New file: `components/internal-profile-combobox.tsx` (global, not scoped
to tender-projects).

```tsx
function InternalProfileCombobox({
  value,
  onValueChange,
  ariaInvalid,
  className,
}: {
  value: string; // internal profile id as string, "" = unset
  onValueChange: (next: string) => void;
  ariaInvalid?: boolean;
  className?: string;
}): JSX.Element
```

This is **not** the existing `components/internal-profile-select.tsx` —
that component wraps `useAvailableInternalProfiles()`, which calls
`GET /internal-profiles/select-available`, filtered to
`whereNull('user_id')` (profiles without a login yet — built for the
"create user" flow). "Person in charge of a project" needs to pick from
*all* internal profiles regardless of login status, and no lightweight
"all profiles" endpoint exists — only the paginated
`GET /internal-profiles` (`per_page` capped at 100 server-side, see
`ListInternalProfilesRequest`), which already supports a `search` param.

Behavior:
- Local `query` state, debounced ~350ms (same debounce shape as
  `useListPageControls`'s search debounce) before it feeds
  `useInternalProfileList(1, 20, debouncedQuery)` (existing hook/endpoint,
  unchanged).
- `Combobox`'s `items` = `data?.data ?? []` (`InternalProfile[]`), updated
  live as the debounced query changes — same Base UI `Combobox` primitive
  as `DepartmentSelect`/`InternalProfileSelect`, but with server-driven
  `items` instead of a static array.
- Item label: `` `${firstname} ${lastname}` `` (no employee_no suffix —
  unlike `AvailableInternalProfile.name`, `InternalProfile` doesn't
  pre-format one; keep it simple, YAGNI).
- Empty state (`ComboboxEmpty`): "ไม่พบพนักงานที่ค้นหา" while `!isFetching`;
  while `isFetching`, list area shows nothing extra (no separate spinner
  slot in the `Combobox` primitive — matches how every other combobox in
  this codebase already skips a loading affordance).
- No "allOption"/clear-to-all concept (unlike `DepartmentSelect`) — this
  field is a plain optional single pick; clearing it is out of scope for
  v1 (matches `personInChargeId` being nullable but the dialog has no
  explicit "unassign" affordance beyond just not selecting anyone before
  submit).

## New component: `ProcurementMethodCombobox`

New files:
- `app/dashboard/tender-projects/_data/procurement-methods.ts` —
  ```ts
  export const PROCUREMENT_METHODS = [
    "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
    "ตลาดอิเล็กทรอนิกส์ (e-market)",
    "คัดเลือก",
    "เฉพาะเจาะจง",
  ];
  ```
- `app/dashboard/tender-projects/_components/procurement-method-combobox.tsx`
  — copies `business-type-combobox.tsx` verbatim (same "+ เพิ่ม" free-text
  add affordance, since backend accepts any string ≤255 chars, no enum),
  swapping `BUSINESS_TYPES` → `PROCUREMENT_METHODS` and placeholder copy
  ("เลือกวิธีจัดซื้อ" / "ค้นหาวิธีจัดซื้อ").

Scoped to `tender-projects/_components` (not global) — unlike the
internal-profile combobox, nothing else in the codebase needs a
procurement-method picker yet; promote it later if that changes.

## Data layer

`lib/tender/tender-projects/types.ts` — add:

```ts
export interface CreateTenderProjectPayload {
  name: string;
  description?: string;
  budget: number;
  departmentId: number;
  personInChargeId?: number;
  procurementMethod: string;
  fiscalYear: number;
  projectStartAt?: string; // "yyyy-MM-dd"
  projectEndAt?: string;
}
```

`lib/tender/tender-projects/api.ts` — replace the empty
`createTenderProjects()` stub:

```ts
export async function createTenderProject(
  payload: CreateTenderProjectPayload,
): Promise<{ projectCode: string }> {
  const { data } = await api.post("/api/v1/dashboard/tender-projects", payload);
  return data.data;
}
```

Only `projectCode` is typed/used from the response (for the success
toast) — the backend design doc's own resource notes show `department`/
`personInCharge`/`createdBy` depend on relations being eager-loaded,
which the create path doesn't guarantee. The frontend doesn't need the
full shape: the list re-fetches via invalidation right after.

`lib/tender/tender-projects/mutations/useCreateTenderProject.ts` — new
file, mirrors `useCreateDepartment`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTenderProject } from "@/lib/tender/tender-projects/api";
import type { CreateTenderProjectPayload } from "@/lib/tender/tender-projects/types";

export function useCreateTenderProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenderProjectPayload) => createTenderProject(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tenders_projects"] }),
  });
}
```

`["tenders_projects"]` is the existing list query's key prefix (see
`useTenderProjectsList`) — invalidating it refreshes the table and the
stats cards (stats come from the same query's `meta`).

## Form schema + hook

`app/dashboard/tender-projects/_schemas/schema.ts` — zod schema mirroring
`DepartmentFormSchema`'s shape, validating the same rules as
`StoreTenderProjectRequest` client-side (required-ness, `max:255` on
`name`/`procurementMethod`, `budget >= 0`, `projectEndAt >= projectStartAt`
when both present).

`app/dashboard/tender-projects/_hooks/use-create-tender-project-form.ts` —
mirrors `useDepartmentForm`: `useForm` + `zodResolver`, `onSubmit` wraps
`useCreateTenderProject().mutateAsync(payload)` in `toast.promise`:
- loading: `กำลังสร้างโครงการ...`
- success: reset form, close dialog (via callback passed in, same as
  `useDepartmentForm`'s `onSubmitted`), return
  `` `สร้างโครงการสำเร็จ (${data.projectCode})` ``
- error: same `getErrorMessage` shape as `useDepartmentForm`/
  `DeleteUserDialog` (Axios `response.data.message`, else Thai fallback
  `สร้างโครงการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง`)

## New component: `CreateTenderProjectDialog`

New file:
`app/dashboard/tender-projects/_components/create-tender-project-dialog.tsx`.
Self-contained trigger + `Dialog`, same shape as `EditDepartmentDialog`:
owns its own `open` state, resets the form on close, renders its own
trigger button (same look as today's button — `Plus` icon + "สร้างโครงการใหม่",
`bg-red-700` — just swapped from a `Link` to a `DialogTrigger`).

```tsx
<DialogTrigger render={<Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10 flex-1" />}>
  <Plus />
  <p>สร้างโครงการใหม่</p>
</DialogTrigger>
```

`departmentId`/`personInChargeId`/`procurementMethod`/`fiscalYear`/date
range fields go through `Controller` (react-hook-form), same pattern as
`create-internal-user-fields.tsx`; `name`/`description`/`budget` use
`register` directly.

## Wiring — `app/dashboard/tender-projects/page.tsx`

Replace lines 116-126 (the `<div><Button render={<Link .../>}>...` block)
with:

```tsx
<CreateTenderProjectDialog />
```

Remove the now-unused `Link` (from `next/link`) and `routes` imports —
nothing else in this file uses them after this change.

## Error handling

Same shape as every other create mutation in this codebase: Axios error's
`response.data.message` if present (422 validation errors surface their
first message), else a Thai fallback string. A 403 (missing
`tender-projects.store` permission — note the backend design doc's Gate
ability is named `.store`, not `.create`, deliberately, to dodge a Spatie
`Gate::before` short-circuit bug) surfaces as an error toast, no special
casing needed.

## Testing

No automated frontend test suite exists in this repo (consistent with
every other frontend spec in this folder). Verification is `tsc --noEmit`
+ `eslint` + manual QA in the dev server: open the dialog, submit with
missing required fields (client-side zod errors), submit valid data
(project appears in the list + stats update without a page reload),
trigger a 422 from the backend if feasible (e.g. `projectEndAt` before
`projectStartAt`), confirm the success toast shows the generated
`project_code`.

## Out of scope

- Editing/deleting a tender project (matches the disabled placeholder
  Actions column already shipped).
- A lightweight "all internal profiles" backend endpoint — the debounced
  search combobox works within the existing paginated endpoint's
  constraints instead.
- Clearing an already-selected `personInChargeId` back to "unassigned"
  from the combobox (no clear affordance in v1).
- Promoting `ProcurementMethodCombobox`/`PROCUREMENT_METHODS` to a global
  location — stays scoped to `tender-projects` until something else needs
  it.
- Any status-transition UI (`draft` → `published` → ...) — every project
  is created as `draft`, matching backend's `TenderProject::create()`.
