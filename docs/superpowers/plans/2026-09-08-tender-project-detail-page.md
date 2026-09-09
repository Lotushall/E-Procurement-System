# Tender Project Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the "ดูรายละเอียด" (view) and "ลบ" (delete) actions on the tender projects list — a real detail page and a working delete confirmation, both currently disabled placeholders.

**Architecture:** Pure frontend work consuming two backend endpoints that already exist (`GET /tender-projects/{id}`, `DELETE /tender-projects/{id}`). Follows the exact structural patterns already established by `vendors/detail` (query-param detail page, `AlertDialog`-based shared delete dialog) and `internal-profiles` (inline-invalidate mutation hooks).

**Tech Stack:** Next.js (App Router, client components), TanStack Query, `axios`, Tailwind, `date-fns`.

## Global Constraints

- No new frontend type needed — reuse the existing `TenderProjects` interface from `lib/tender/tender-projects/types.ts` (both backend endpoints return the same `TenderProjectResource` shape already used by the list).
- "แก้ไข" (edit) stays disabled — no backend update endpoint exists (confirmed: `routes/api/v1/dashboard/tender-projects.php` has only `index`, `show`, `store`, `destroy`). Do not build an edit page or endpoint in this plan.
- No TOR list section and no status-workflow actions (publish/close/cancel) — no backend support for either.
- This repo has no automated frontend test runner (`package.json` scripts are only `dev`/`build`/`start`/`lint`) and no browser automation available. Verification is `npx tsc --noEmit` (must show no *new* errors — two pre-existing, unrelated errors in `app/(auth)/register/page.tsx` and `app/dashboard/internal-employees/departments-positions/page.tsx` are expected and not caused by this work) plus a manually-described smoke check at the end.
- Match existing code style exactly: 4-space indentation in files under `app/dashboard/tender-projects/` (matches `columns.tsx`'s existing indentation); 2-space indentation everywhere else touched by this plan — `lib/` files and `components/disabled-action-button.tsx` (verified against `components/department-select.tsx`, the existing sibling file in that shared directory, which is 2-space — the shared `components/` directory follows the `lib/`-style 2-space convention, not the 4-space convention local to `app/dashboard/tender-projects/`). *Correction, recorded during Task 2's review: the plan originally stated 4-space for `disabled-action-button.tsx`; that was a documentation error on the plan author's part, caught by the task reviewer and fixed here rather than "fixed" in code — the implementer's 2-space output was already correct.*

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/tender/tender-projects/api.ts` (modify) | Add `fetchTenderProjectDetail`, `deleteTenderProject` |
| `lib/tender/tender-projects/queries/useTendersProjectDetail.ts` (fill in, currently empty) | React Query hook wrapping `fetchTenderProjectDetail` |
| `lib/tender/tender-projects/mutations/useDeleteTenderProject.ts` (create) | React Query mutation wrapping `deleteTenderProject` |
| `components/disabled-action-button.tsx` (create) | Shared "coming soon" disabled icon button, extracted from `columns.tsx` |
| `app/dashboard/tender-projects/_components/table/columns.tsx` (modify) | Import the extracted button; wire real Eye/Delete actions |
| `app/dashboard/tender-projects/_components/delete-tender-project-dialog.tsx` (create) | Shared delete confirmation dialog (list row + detail page) |
| `app/dashboard/tender-projects/detail/_hooks/use-tender-project-detail-page.ts` (create) | Loads one project by id, sets breadcrumb, computes `notFound` |
| `app/dashboard/tender-projects/detail/page.tsx` (create) | The detail page itself |

---

### Task 1: Detail-fetch and delete data layer

**Files:**
- Modify: `lib/tender/tender-projects/api.ts`
- Create: `lib/tender/tender-projects/queries/useTendersProjectDetail.ts` (currently empty)
- Create: `lib/tender/tender-projects/mutations/useDeleteTenderProject.ts`

**Interfaces:**
- Consumes: `TenderProjects` type from `./types` (already defined — `id, projectCode, name, description, budget, department, personInCharge, createdBy, procurementMethod, fiscalYear, projectStartAt, projectEndAt, status`).
- Produces: `fetchTenderProjectDetail(id: number): Promise<TenderProjects>`, `deleteTenderProject(id: number): Promise<void>` (both from `api.ts`); `useTendersProjectDetail(id: number)` → `UseQueryResult<TenderProjects>`; `useDeleteTenderProject()` → `UseMutationResult<void, unknown, number>`.

- [ ] **Step 1: Add the two API functions**

Open `lib/tender/tender-projects/api.ts`. It currently ends with `createTenderProject`. Add these two functions after it:

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

The `TenderProjects` type is already imported at the top of this file (used by `PaginatedTenderProjectsList`), so no new import is needed.

- [ ] **Step 2: Fill in the (currently empty) query hook**

Write `lib/tender/tender-projects/queries/useTendersProjectDetail.ts` in full:

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchTenderProjectDetail } from "../api";

export function useTendersProjectDetail(id: number) {
  return useQuery({
    queryKey: ["tenders_projects", "detail", id],
    queryFn: () => fetchTenderProjectDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
```

- [ ] **Step 3: Write the delete mutation hook**

Create `lib/tender/tender-projects/mutations/useDeleteTenderProject.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTenderProject } from "@/lib/tender/tender-projects/api";

export function useDeleteTenderProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTenderProject(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tenders_projects"] }),
  });
}
```

This mirrors `useCreateTenderProject.ts`'s inline-invalidate style exactly (same file, same pattern, just `mutationFn` swapped).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p .` (from `frontend/`)
Expected: no errors from the three files touched in this task (the two pre-existing unrelated errors listed in Global Constraints are fine).

- [ ] **Step 5: Commit**

```bash
git add lib/tender/tender-projects/api.ts lib/tender/tender-projects/queries/useTendersProjectDetail.ts lib/tender/tender-projects/mutations/useDeleteTenderProject.ts
git commit -m "feat(tender): add detail fetch and delete data layer for tender projects"
```

---

### Task 2: Extract `DisabledActionButton` to a shared component

**Files:**
- Create: `components/disabled-action-button.tsx`
- Modify: `app/dashboard/tender-projects/_components/table/columns.tsx`

**Interfaces:**
- Produces: `DisabledActionButton({ icon: LucideIcon, label: string, iconClassName?: string })` — used by Task 4 (list Pencil button) and Task 6 (detail page Pencil button).

**Context:** `columns.tsx` currently defines `DisabledActionButton` as a private, unexported function (lines 15–39) plus a module-level `const COMING_SOON_MESSAGE = "ฟีเจอร์นี้ยังไม่เปิดใช้งาน";` (line 13). The detail page (Task 6) also needs this exact component, so it must move to a shared location first.

- [ ] **Step 1: Create the shared component**

Write `components/disabled-action-button.tsx` in full (same implementation as the current private version in `columns.tsx`, just relocated and exported, with `icon` typed as `LucideIcon` instead of `typeof Eye`):

```tsx
"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COMING_SOON_MESSAGE = "ฟีเจอร์นี้ยังไม่เปิดใช้งาน";

export function DisabledActionButton({
  icon: Icon,
  label,
  iconClassName,
}: {
  icon: LucideIcon;
  label: string;
  iconClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
        <Button
          variant="outline"
          aria-label={label}
          disabled
          className="size-8 px-1.5 pt-px rounded-md bg-white disabled:cursor-not-allowed"
        >
          <Icon className={iconClassName ?? "w-4 h-4 text-gray-500"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{COMING_SOON_MESSAGE}</TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 2: Remove the local definition from `columns.tsx` and import the shared one**

In `app/dashboard/tender-projects/_components/table/columns.tsx`, replace:

```tsx
const COMING_SOON_MESSAGE = "ฟีเจอร์นี้ยังไม่เปิดใช้งาน";

function DisabledActionButton({
    icon: Icon,
    label,
    iconClassName,
}: {
    icon: typeof Eye;
    label: string;
    iconClassName?: string;
}) {
    return (
        <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
                <Button
                    variant="outline"
                    aria-label={label}
                    disabled
                    className="size-8 px-1.5 pt-px rounded-md bg-white disabled:cursor-not-allowed"
                >
                    <Icon className={iconClassName ?? "w-4 h-4 text-gray-500"} />
                </Button>
            </TooltipTrigger>
            <TooltipContent>{COMING_SOON_MESSAGE}</TooltipContent>
        </Tooltip>
    );
}
```

with nothing (delete it entirely), and add this import near the top of the file (alongside the other component imports):

```tsx
import { DisabledActionButton } from "@/components/disabled-action-button";
```

Leave the `Tooltip, TooltipContent, TooltipTrigger` import from `@/components/ui/tooltip` in place for now — Task 4 removes it once nothing else in the file uses it directly.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (the Pencil/Trash/Eye `DisabledActionButton` usages further down the file still compile against the imported component's identical signature).

Run: `npx eslint app/dashboard/tender-projects/_components/table/columns.tsx components/disabled-action-button.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/disabled-action-button.tsx app/dashboard/tender-projects/_components/table/columns.tsx
git commit -m "refactor(tender): extract DisabledActionButton to a shared component"
```

---

### Task 3: `DeleteTenderProjectDialog` component

**Files:**
- Create: `app/dashboard/tender-projects/_components/delete-tender-project-dialog.tsx`

**Interfaces:**
- Consumes: `useDeleteTenderProject()` from Task 1 (`.mutateAsync(id: number): Promise<void>`, `.isPending: boolean`).
- Produces: `DeleteTenderProjectDialog({ tenderProjectId: number, displayName: string, trigger: ReactElement, triggerChildren: ReactNode, onSuccess?: () => void })` — used by Task 4 (list row) and Task 6 (detail page).

**Context:** Copies `app/dashboard/vendors/_components/delete-vendor-dialog.tsx`'s exact shape — a caller-supplied `trigger`/`triggerChildren` instead of a hardcoded icon, so one component serves both a small icon button (list row) and a larger labeled button (detail page).

- [ ] **Step 1: Write the component**

Create `app/dashboard/tender-projects/_components/delete-tender-project-dialog.tsx` in full:

```tsx
"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteTenderProject } from "@/lib/tender/tender-projects/mutations/useDeleteTenderProject";

function getErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ลบโครงการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

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
}) {
    const [open, setOpen] = useState(false);
    const deleteTenderProjectMutation = useDeleteTenderProject();

    const handleDelete = () => {
        toast.promise(deleteTenderProjectMutation.mutateAsync(tenderProjectId), {
            loading: "กำลังลบโครงการ...",
            success: () => {
                setOpen(false);
                onSuccess?.();
                return "ลบโครงการสำเร็จ";
            },
            error: getErrorMessage,
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger render={trigger}>{triggerChildren}</AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>ลบโครงการ</AlertDialogTitle>
                    <AlertDialogDescription>
                        ต้องการลบโครงการ &quot;{displayName}&quot; ใช่หรือไม่?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteTenderProjectMutation.isPending}
                        className="bg-red-700 text-white hover:bg-red-600"
                        onClick={handleDelete}
                    >
                        ลบโครงการ
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors (this file isn't imported anywhere yet, so it only needs to compile standalone).

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/tender-projects/_components/delete-tender-project-dialog.tsx
git commit -m "feat(tender): add delete confirmation dialog for tender projects"
```

---

### Task 4: Wire the real Eye/Delete actions into the list table

**Files:**
- Modify: `app/dashboard/tender-projects/_components/table/columns.tsx`

**Interfaces:**
- Consumes: `DeleteTenderProjectDialog` from Task 3 (exact props above); `routes.dashboards.tender_project.detail(id: number | string): string` (already exists in `lib/routes.ts`).

- [ ] **Step 1: Update imports**

At the top of `app/dashboard/tender-projects/_components/table/columns.tsx`, the current imports are:

```tsx
"use client"

import { Eye, Pencil, Trash2 } from "lucide-react";
import { TenderProjects } from "@/lib/tender/tender-projects/types";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DisabledActionButton } from "@/components/disabled-action-button";
```

(the last line was added in Task 2). Replace the whole block with:

```tsx
"use client"

import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { TenderProjects } from "@/lib/tender/tender-projects/types";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";
import { Button } from "@/components/ui/button";
import { DisabledActionButton } from "@/components/disabled-action-button";
import { routes } from "@/lib/routes";
import { DeleteTenderProjectDialog } from "../delete-tender-project-dialog";
```

(`Tooltip, TooltipContent, TooltipTrigger` is dropped — nothing else in this file uses it now that `DisabledActionButton` lives elsewhere. `COMING_SOON_MESSAGE` from Task 2 is already gone.)

- [ ] **Step 2: Replace the actions cell**

The `actions` column currently reads:

```tsx
        {
            id: "actions",
            header: () => <ColumnHeader label="Actions" align="center" />,
            enableHiding: false,
            cell: () => (
                <div className="flex justify-center gap-1.5">
                    <DisabledActionButton icon={Eye} label="ดูรายละเอียด" />
                    <DisabledActionButton icon={Pencil} label="แก้ไข" />
                    <DisabledActionButton icon={Trash2} label="ลบ" iconClassName="w-4 h-4 text-red-600" />
                </div>
            ),
        },
```

Replace it with:

```tsx
        {
            id: "actions",
            header: () => <ColumnHeader label="Actions" align="center" />,
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex justify-center gap-1.5">
                    <Button
                        variant="outline"
                        render={<Link href={routes.dashboards.tender_project.detail(row.original.id)} />}
                        nativeButton={false}
                        aria-label="ดูรายละเอียด"
                        className="size-8 px-1.5 pt-px rounded-md bg-white"
                    >
                        <Eye className="w-4 h-4 text-gray-500" />
                    </Button>

                    <DisabledActionButton icon={Pencil} label="แก้ไข" />

                    <DeleteTenderProjectDialog
                        tenderProjectId={row.original.id}
                        displayName={row.original.name}
                        trigger={
                            <Button
                                variant="outline"
                                aria-label="ลบโครงการ"
                                className="size-8 px-1.5 pt-px rounded-md bg-white"
                            />
                        }
                        triggerChildren={<Trash2 className="w-4 h-4 text-red-600" />}
                    />
                </div>
            ),
        },
```

This mirrors `app/dashboard/vendors/_components/table/columns.tsx`'s Eye-link-button and `DeleteVendorDialog` usage exactly, just renamed to the tender-project equivalents.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

Run: `npx eslint app/dashboard/tender-projects/_components/table/columns.tsx`
Expected: no errors (confirms no unused imports were left behind).

- [ ] **Step 4: Manual smoke check**

Start the dev server (`npm run dev`) if not already running, open `/dashboard/tender-projects`, and confirm:
- The Eye button in each row is a real link that navigates to `/dashboard/tender-projects/detail?id=<id>` (this will 404/error until Task 6 lands — that's expected at this point in the plan).
- The Trash button opens the "ลบโครงการ" confirmation dialog with the correct project name, and confirming it removes the row from the table (the `DELETE` endpoint and invalidation from Task 1 already work end-to-end here).
- The Pencil button still shows the disabled "ฟีเจอร์นี้ยังไม่เปิดใช้งาน" tooltip, unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/tender-projects/_components/table/columns.tsx
git commit -m "feat(tender): wire real view and delete actions into the tender project list"
```

---

### Task 5: Detail page hook

**Files:**
- Create: `app/dashboard/tender-projects/detail/_hooks/use-tender-project-detail-page.ts`

**Interfaces:**
- Consumes: `useTendersProjectDetail(id: number)` from Task 1; `useBreadcrumb` from `@/lib/breadcrumb/useBreadcrumb` (existing, used by `app/dashboard/tender-projects/page.tsx` and `use-vendor-detail-page.ts` — accepts an array of `{ label: string; href?: string } | { loading: true }`); `routes.dashboards.tender_project.index: string` (existing).
- Produces: `useTenderProjectDetailPage(id: number): { project: TenderProjects | undefined; isValidId: boolean; isPending: boolean; notFound: boolean }` — used by Task 6.

- [ ] **Step 1: Write the hook**

Create `app/dashboard/tender-projects/detail/_hooks/use-tender-project-detail-page.ts` in full:

```ts
"use client";

import { useTendersProjectDetail } from "@/lib/tender/tender-projects/queries/useTendersProjectDetail";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";

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

This mirrors `use-vendor-detail-page.ts`'s `isValidId`/`notFound` logic exactly, minus the vendor-specific action mutations (out of scope here — no status-workflow actions per Global Constraints).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/tender-projects/detail/_hooks/use-tender-project-detail-page.ts
git commit -m "feat(tender): add tender project detail page data hook"
```

---

### Task 6: Detail page UI

**Files:**
- Create: `app/dashboard/tender-projects/detail/page.tsx`

**Interfaces:**
- Consumes: `useTenderProjectDetailPage(id)` from Task 5; `DeleteTenderProjectDialog` from Task 3; `DisabledActionButton` from Task 2; `TenderProjectStatusBadge` from `@/components/tender-project-status-badge` (existing, `{ status: string; className?: string }`); `formatCurrency` from `@/lib/utils` (existing, `(value: number) => string`); `routes.dashboards.tender_project.index` (existing).

- [ ] **Step 1: Write the page**

Create `app/dashboard/tender-projects/detail/page.tsx` in full:

```tsx
"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DisabledActionButton } from "@/components/disabled-action-button";
import { TenderProjectStatusBadge } from "@/components/tender-project-status-badge";
import { DeleteTenderProjectDialog } from "../_components/delete-tender-project-dialog";
import { useTenderProjectDetailPage } from "./_hooks/use-tender-project-detail-page";
import { routes } from "@/lib/routes";
import { cn, formatCurrency } from "@/lib/utils";

function InfoItem({
    label,
    value,
    cols,
}: {
    label: string;
    value?: string | null;
    cols?: number;
}) {
    return (
        <div className={cn("flex min-w-0 flex-col gap-1.5", cols === 2 && "sm:col-span-2")}>
            <p className="text-xs md:text-sm tracking-wide text-gray-500">{label}</p>
            <p className="rounded-sm border border-input bg-transparent px-2.5 py-2 text-sm md:text-base font-medium wrap-break-word">
                {value || "-"}
            </p>
        </div>
    );
}

function TenderProjectDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = Number(searchParams.get("id"));

    const { project, isValidId, isPending, notFound } = useTenderProjectDetailPage(id);

    if (isValidId && isPending) {
        return (
            <div className="flex justify-center py-12">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (notFound || !project) {
        return (
            <p className="py-12 text-center text-sm text-muted-foreground">
                ไม่พบข้อมูลโครงการนี้
            </p>
        );
    }

    const personInChargeName =
        project.personInCharge?.firstname && project.personInCharge?.lastname
            ? `${project.personInCharge.firstname} ${project.personInCharge.lastname}`
            : undefined;

    const period = `${format(new Date(project.projectStartAt), "d MMM yyyy", { locale: th })} - ${format(new Date(project.projectEndAt), "d MMM yyyy", { locale: th })}`;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">{project.name}</h1>
                        <TenderProjectStatusBadge status={project.status} />
                    </div>
                    <p className="text-xs text-red-700 font-semibold">{project.projectCode}</p>
                </div>

                <div className="flex items-center gap-2">
                    <DisabledActionButton icon={Pencil} label="แก้ไข" />
                    <DeleteTenderProjectDialog
                        tenderProjectId={project.id}
                        displayName={project.name}
                        trigger={<Button type="button" variant="destructive" />}
                        triggerChildren="ลบโครงการ"
                        onSuccess={() => router.push(routes.dashboards.tender_project.index)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2">
                <InfoItem label="แผนก" value={project.department?.name} />
                <InfoItem label="ผู้รับผิดชอบ" value={personInChargeName} />
                <InfoItem label="งบประมาณ" value={formatCurrency(Number(project.budget))} />
                <InfoItem label="ปีงบประมาณ" value={project.fiscalYear} />
                <InfoItem label="วิธีจัดซื้อ" value={project.procurementMethod} />
                <InfoItem label="ผู้สร้างโครงการ" value={project.createdBy?.username} />
                <InfoItem label="ระยะเวลาโครงการ" value={period} cols={2} />
                <InfoItem label="รายละเอียด" value={project.description} cols={2} />
            </div>
        </div>
    );
}

export default function TenderProjectDetailPage() {
    return (
        <Suspense fallback={null}>
            <TenderProjectDetailContent />
        </Suspense>
    );
}
```

Note: `routes.dashboards.tender_project.detail(id)` already points at `/dashboard/tender-projects/detail?id=${id}` (in `lib/routes.ts`), so this file at `app/dashboard/tender-projects/detail/page.tsx` is the correct location for the App Router to serve that path — no routing changes needed elsewhere.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

Run: `npx eslint app/dashboard/tender-projects/detail/page.tsx`
Expected: no errors.

- [ ] **Step 3: Manual smoke check**

With the dev server running:
- From `/dashboard/tender-projects`, click the Eye button on any row → lands on `/dashboard/tender-projects/detail?id=<id>` showing that project's name, status badge, project code, department, person in charge (or "-" if unset), budget (comma-formatted), fiscal year, procurement method, created-by username, project period, and description.
- Breadcrumb shows "จัดการโครงการจัดซื้อจัดจ้าง" (linking back to the list) → project name.
- Pencil button shows the disabled tooltip.
- Clicking "ลบโครงการ" → confirm → navigates back to `/dashboard/tender-projects` and the deleted project is gone from the list.
- Visiting `/dashboard/tender-projects/detail?id=999999` (a non-existent id) shows "ไม่พบข้อมูลโครงการนี้".
- Visiting `/dashboard/tender-projects/detail` (no `id` at all) also shows "ไม่พบข้อมูลโครงการนี้" (invalid id path).

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/tender-projects/detail/page.tsx
git commit -m "feat(tender): add tender project detail page"
```

---

## Self-Review Notes

- **Spec coverage:** data layer (Task 1), shared disabled button (Task 2), delete dialog (Task 3), list wiring (Task 4), detail page hook + UI (Tasks 5–6) — every section of the design doc maps to a task.
- **Type consistency:** `DeleteTenderProjectDialog`'s prop `tenderProjectId` is used identically in Task 4 (`row.original.id`) and Task 6 (`project.id`); `DisabledActionButton`'s `icon`/`label`/`iconClassName` props are unchanged from the original inline version, so both call sites (Task 4, Task 6) match its Task 2 definition.
- **No placeholders:** every step above has complete, exact code — nothing deferred to "later".
