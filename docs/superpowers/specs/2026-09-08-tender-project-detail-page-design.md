# Tender project detail page (view + delete)

## Goal

Wire up the "ดูรายละเอียด" (view) and "ลบ" (delete) actions on the tender
projects list, both currently disabled placeholders in
`app/dashboard/tender-projects/_components/table/columns.tsx`. "แก้ไข" (edit)
stays disabled — no backend update endpoint exists yet
(`routes/api/v1/dashboard/tender-projects.php` has only `index`, `show`,
`store`, `destroy`).

Backend support already exists for both actions in scope:
- `GET /api/v1/dashboard/tender-projects/{id}` → `TenderProjectController::show`
- `DELETE /api/v1/dashboard/tender-projects/{id}` → `TenderProjectController::destroy`

Both return/consume the same `TenderProjectResource` shape already used by
the list, so no new frontend type is needed — reuse the existing
`TenderProjects` interface from `lib/tender/tender-projects/types.ts`.

Out of scope: a TOR list section (the list's "TOR" column is still a static
`"-"` placeholder — no TOR data/endpoint exists), and any status-workflow
actions (publish/close/cancel — no backend support). Both are natural future
additions once their backend pieces exist.

## Data layer

**`lib/tender/tender-projects/api.ts`** — add two functions, following the
existing `fetchTenderProjectsList`/`createTenderProject` style:

```ts
export async function fetchTenderProjectDetail(id: number): Promise<TenderProjects> {
  const { data } = await api.get<{ data: TenderProjects }>(
    `/api/v1/dashboard/tender-projects/${id}`,
  );
  return data.data;
}

export async function deleteTenderProject(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/tender-projects/${id}`);
}
```

**`lib/tender/tender-projects/queries/useTendersProjectDetail.ts`** (currently
an empty file) — fill in, mirroring `useUserDetail`/`useVendorDetail`:

```ts
export function useTendersProjectDetail(id: number) {
  return useQuery({
    queryKey: ["tenders_projects", "detail", id],
    queryFn: () => fetchTenderProjectDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
```

**`lib/tender/tender-projects/mutations/useDeleteTenderProject.ts`** (new) —
mirrors `useCreateTenderProject`'s inline-invalidate style (this module
doesn't use a separate `useInvalidateX` helper the way `internal-profiles`
does):

```ts
export function useDeleteTenderProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTenderProject(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tenders_projects"] }),
  });
}
```

## `DeleteTenderProjectDialog`

New file: `app/dashboard/tender-projects/_components/delete-tender-project-dialog.tsx`
(sibling-level, not under `detail/_components` — it's shared between the list
table and the detail page, matching where `DeleteVendorDialog` lives relative
to `vendors/_components/table/columns.tsx` and `vendors/detail/page.tsx`).

Copies `DeleteVendorDialog`'s exact shape — a caller-supplied trigger instead
of a hardcoded icon button, so the same component serves both a small icon
button (list row) and a larger labeled button (detail page header):

```tsx
export function DeleteTenderProjectDialog({
  tenderProjectId,
  displayName,
  trigger,
  triggerChildren,
  onSuccess,
}: {
  tenderProjectId: number;
  displayName: string;
  trigger: ReactElement;
  triggerChildren: ReactNode;
  onSuccess?: () => void;
}): JSX.Element
```

Body: `AlertDialog` with title "ลบโครงการ", description
`ต้องการลบโครงการ "{displayName}" ใช่หรือไม่?`, confirm button calls
`useDeleteTenderProject().mutateAsync(tenderProjectId)` wrapped in
`toast.promise` (loading/success/error), closes on success and calls
`onSuccess?.()`. Error message helper mirrors `DeleteVendorDialog`'s
`getErrorMessage` (falls back to "ลบโครงการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง").

## Detail page

New route: `app/dashboard/tender-projects/detail/page.tsx`, matching the
existing `routes.dashboards.tender_project.detail(id)` helper
(`/dashboard/tender-projects/detail?id=${id}`, already defined in
`lib/routes.ts`) and the `vendors/detail`/`users/edit` query-param + Suspense
pattern.

**New hook**: `app/dashboard/tender-projects/detail/_hooks/use-tender-project-detail-page.ts`,
mirrors `use-vendor-detail-page.ts`:

```ts
export function useTenderProjectDetailPage(id: number) {
  const isValidId = Number.isFinite(id) && id > 0;
  const { data: project, isPending, isError } = useTendersProjectDetail(id);
  const notFound = !isValidId || (isError && !project) || (!isPending && !project);

  useBreadcrumb([
    { label: "จัดการโครงการจัดซื้อจัดจ้าง", href: routes.dashboards.tender_project.index },
    isValidId && isPending ? { loading: true } : { label: project?.name ?? "ไม่พบข้อมูล" },
  ]);

  return { project, isValidId, isPending, notFound };
}
```

**Page body** (once `project` loads): same loading-spinner /
not-found-message branches as `vendors/detail/page.tsx`. Layout:

- Header row: project name (`text-2xl font-bold`) + `TenderProjectStatusBadge`
  next to it, project code (`text-red-700 font-semibold`, same styling as the
  list's `projectCode` column) underneath. Right side:
  disabled Edit button (`Pencil`, tooltip "ฟีเจอร์นี้ยังไม่เปิดใช้งาน") and the
  real `DeleteTenderProjectDialog` (labeled button, `onSuccess` navigates to
  `routes.dashboards.tender_project.index` via `useRouter().push`).

  `DisabledActionButton` (the tooltip-wrapped disabled icon button) is
  currently a private, unexported function inside `columns.tsx` — needed on
  this page too, so pull it out to `components/disabled-action-button.tsx`
  (unchanged implementation, just relocated) and update `columns.tsx` to
  import it from there instead of defining it locally.
- Info grid (`grid gap-4 sm:grid-cols-2`, matching the create dialog's field
  grouping style): แผนก (`department.name`), ผู้รับผิดชอบ
  (`personInCharge` firstname+lastname, or "-" if absent), งบประมาณ
  (`formatCurrency(budget)`) + ปีงบประมาณ, วิธีจัดซื้อ, ระยะเวลาโครงการ
  (`projectStartAt`–`projectEndAt`, same `date-fns`/`th` locale formatting as
  the list column), ผู้สร้างโครงการ (`createdBy.username` — `User` has no
  `name` field, only `username`/`email`).
- รายละเอียด (`description`) as a full-width paragraph below the grid.

All read-only — plain `<p>` tags with the list's existing label/value text
styles, no form inputs.

## Wiring into the list

**`columns.tsx`** actions cell:
- Eye button: replace `DisabledActionButton` with a real `Link` button to
  `routes.dashboards.tender_project.detail(row.original.id)`, copying the
  `vendors` list's `<Button render={<Link .../>} nativeButton={false}>` shape.
- Trash button: replace `DisabledActionButton` with
  `<DeleteTenderProjectDialog tenderProjectId={row.original.id} displayName={row.original.name} trigger={...} triggerChildren={<Trash2 .../>} />`
  (no `onSuccess` needed here — the list re-renders via the mutation's own
  query invalidation).
- Pencil button: unchanged, stays a `DisabledActionButton`.

## Testing

No backend changes, so no backend tests. Frontend: `tsc --noEmit` and a
manual smoke check (list → view detail → delete from detail page returns to
list; delete from list row removes it in place) since this repo has no
browser automation available.
