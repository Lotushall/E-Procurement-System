# Department/Position Management: List + CRUD

## Problem

`app/dashboard/internal-employees/departments-positions/page.tsx` already has
tab navigation ("แผนก" / "ตำแหน่ง") wired up, but both tab bodies are stubs:
`department-tab.tsx` calls a `useDepartment()` hook that doesn't exist, and
`position-tab.tsx` renders a placeholder string. The "add" button slot in the
page header is also a literal placeholder string
(`"<RoleFormDialog />"` / `"<PermissionFormDialog />"`), not real JSX.

The backend already exposes full CRUD for both resources
(`GET/POST /departments`, `PATCH/DELETE /departments/{id}`, same for
`/positions`), used by nothing on the frontend yet except the `/select`
variants (`useDepartmentOptions`/`usePositionOptions`, consumed by the
internal-profile create/edit forms).

## Scope

Frontend only, in `frontend/`. No backend changes — the existing
`DepartmentController`/`PositionController` endpoints already return
everything needed (`id`, `name`, `internalProfilesCount`) and already
validate/block deletes with a user-facing Thai error message when the
department/position still has profiles attached.

Each tab gets a plain list (search + table) plus create/edit/delete, built by
mirroring the existing `internal-profiles` list page pattern file-for-file.
Department and position are structurally identical but kept as separate
files/components, matching the existing convention in this codebase
(`DepartmentSelect`/`PositionSelect` are already separate components despite
being structurally identical).

## Design

### Why a plain list, not `DataTable`

`GET /departments` and `GET /positions` return the full collection
unpaginated, unsorted-by-request, with no `search` param (unlike
`/internal-profiles`, which supports all three). The existing `DataTable`
component (`components/ui/data-table.tsx`) is built around
`manualPagination`/`manualSorting` driven by the server and doesn't fit a
full-collection response. Department/position counts are expected to stay
small, so: fetch the full list once, filter by name client-side as the user
types, render with the plain `Table` primitives. No pagination, no
server-driven sorting.

### Data layer (`lib/internal-profiles/`)

`types.ts`: add `CreateDepartmentPayload = { name: string }` and
`UpdateDepartmentPayload = CreateDepartmentPayload` (same pair for
`Position`). `Department`/`Position` already exist with
`internalProfilesCount`.

`api.ts`: add, alongside the existing `fetchDepartmentOptions`:

- `fetchDepartmentList()` → `GET /api/v1/dashboard/departments`
- `createDepartment(payload)` → `POST /api/v1/dashboard/departments`
- `updateDepartment(id, payload)` → `PATCH /api/v1/dashboard/departments/{id}`
- `deleteDepartment(id)` → `DELETE /api/v1/dashboard/departments/{id}`
- Same four for `Position` against `/positions`.

`queries/useDepartmentList.ts` (currently an empty file, already created):
plain `useQuery({ queryKey: ["departments", "list"], queryFn: fetchDepartmentList })`.
`queries/usePositionList.ts`: same shape, key `["positions", "list"]`.

`mutations/`: `useInvalidateDepartments.ts` (invalidates the `["departments"]`
prefix — this also invalidates `["departments", "select"]`, so the dropdown
in the internal-profile form picks up create/edit/delete automatically),
`useCreateDepartment.ts`, `useUpdateDepartment.ts`, `useDeleteDepartment.ts`.
Same four files for `Position`. All mirror
`useCreateInternalProfile.ts`/`useUpdateInternalProfile.ts`/`useDeleteInternalProfile.ts`
exactly (`useMutation` + `onSettled: invalidate`).

### UI (`departments-positions/_components/`, `_hooks/`, `_schemas/`)

`_schemas/schema.ts`: `DepartmentFormSchema = z.object({ name: z.string().min(1, "กรุณากรอกชื่อแผนก") })`,
`PositionFormSchema` same with "กรุณากรอกชื่อตำแหน่ง".

`_hooks/use-department-form.ts` / `use-edit-department-form.ts` (+ position
pair): mirror `use-internal-profile-form.ts` /
`use-edit-internal-profile-form.ts` — `react-hook-form` + `zodResolver`,
`toast.promise` around the mutation, same `getErrorMessage` (reads
`response.data.errors` for 422 validation errors, falls back to
`response.data.message` — this is how the backend's "ไม่สามารถลบ...ที่ยังมี
ผู้ใช้งานอยู่ได้" delete-block message reaches the UI without any
frontend-specific handling).

`_components/department-form-dialog.tsx` (create trigger, replaces the
`"<RoleFormDialog />"` placeholder in `page.tsx`), `edit-department-dialog.tsx`
(pencil icon trigger), `delete-department-dialog.tsx` (trash icon trigger,
`AlertDialog`, shows the backend's block message via `getErrorMessage` — no
preemptive `internalProfilesCount > 0` disabling on the frontend, since the
backend already returns a clear 422 message and internal-profiles' own delete
dialog doesn't preemptively disable either, it just surfaces the server
error). Same three files for `Position`. Each mirrors
`internal-profile-form-dialog.tsx`/`edit-internal-profile-dialog.tsx`/`delete-internal-profile-dialog.tsx`,
but the form body is a single `name` field instead of the multi-field profile
form.

`_components/list-table-skeleton.tsx`: one shared skeleton (no props, no
domain type) reused by both tabs while `isPending` — purely visual, so
sharing it doesn't conflict with the "separate files per entity" convention
that applies to components carrying domain logic/types.

`department-tab.tsx` / `position-tab.tsx`: `"use client"`; local
`useState("")` for search text, `useMemo` to filter the fetched list by
`name` (case-insensitive `includes`); render `SearchInput` + a plain `Table`
(columns: name, `internalProfilesCount` as "จำนวนพนักงาน", actions with edit
+ delete) inside the existing `rounded-xl border shadow-md` wrapper style used
elsewhere. States: `isPending` → skeleton, `isError` → inline error text,
empty list → "ยังไม่มี.../ไม่พบ...ที่ตรงกับคำค้นหา" (mirrors the
internal-profiles page's empty-state copy pattern). Remove the stray
`useDepartment()` call in `department-tab.tsx` (calls a hook that doesn't
exist today).

`page.tsx`: replace the two placeholder strings with real
`<DepartmentFormDialog />` / `<PositionFormDialog />`, conditionally rendered
on `activeTab` exactly as already wired.

### Error handling

No new error-handling pattern — reuses the existing `getErrorMessage`
helper shape (422 field errors → first message; otherwise
`response.data.message`; otherwise a generic Thai fallback) already used by
every internal-profiles mutation dialog.

### Testing

No browser automation available in this environment. Verification is
`tsc`/lint/build plus manually listing what changed for the user to QA in
their own browser; UI correctness claims will be scoped to what static checks
actually confirm.

## Out of scope

- Backend changes of any kind — all required endpoints already exist.
- Pagination or server-driven sorting/search for departments/positions
  (explicitly declined: lists are expected to stay small).
- Preemptively disabling the delete action based on `internalProfilesCount`
  client-side (the backend's 422 message already covers this case).
- Changing `/departments/select` or `/positions/select` or their consumers.
