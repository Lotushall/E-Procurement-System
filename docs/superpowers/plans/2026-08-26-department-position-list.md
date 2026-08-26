# Department/Position List + CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the department and position tabs on `dashboard/internal-employees/departments-positions` — a searchable list plus create/edit/delete for each, both currently stubs.

**Architecture:** Frontend-only. The backend already exposes full CRUD (`/api/v1/dashboard/departments`, `/api/v1/dashboard/positions`) returning the full unpaginated collection. Each tab fetches its full list once via `@tanstack/react-query`, filters by name client-side as the user types (no server pagination/sort/search — the endpoint doesn't support them and lists are expected to stay small), and renders with the plain `Table` primitives. CRUD dialogs, form hooks, and data-layer files mirror the existing `internal-profiles` module file-for-file, kept as separate Department/Position files per this codebase's established convention (see `DepartmentSelect`/`PositionSelect`).

**Tech Stack:** Next.js App Router + TypeScript + `@tanstack/react-query` + `react-hook-form` + `zod` + Tailwind v4 + base-ui components.

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-08-26-department-position-list-design.md`.
- Monorepo root is `D:\E-Procurement-System`; this plan's file paths are given relative to that root (`frontend/...`).
- Branch `Internal`, working in place, no worktree — established repo convention.
- **Commit policy for this plan (explicit user instruction, overrides the executing-skill's normal per-task auto-commit default):** at the end of each task, `git add` the exact files touched by that task only. Do **not** run `git commit`. The user reviews and commits manually when ready.
- Before staging, run `git status --short` first — a sibling frontend/backend session may have unrelated uncommitted work in the same working tree (established repo pattern). Only stage the files this task touches.
- No backend changes in this plan — every endpoint used already exists and is already covered by existing backend tests.
- Frontend: no test runner exists in this repo (established convention, confirmed via `package.json` — no jest/vitest/@testing-library, no `*.test.*` files anywhere). Verify every task with `npx tsc --noEmit` and `npm run lint` (run from `frontend/`), not with new test files.
- No browser automation tool (chromium-cli/Playwright) is available in this dev environment. Manual browser QA must be disclosed as unperformed/pending to the user in the final task, not silently skipped.
- Follow existing patterns exactly: mirror `useCreateInternalProfile`/`useUpdateInternalProfile`/`useDeleteInternalProfile`/`useInvalidateInternalProfiles` (`frontend/lib/internal-profiles/mutations/`), `use-internal-profile-form.ts`/`use-edit-internal-profile-form.ts` (`frontend/app/dashboard/internal-employees/_hooks/`), and `internal-profile-form-dialog.tsx`/`edit-internal-profile-dialog.tsx`/`delete-internal-profile-dialog.tsx` (`frontend/app/dashboard/internal-employees/_components/`). Do not introduce a shared generic "entity CRUD" abstraction — Department and Position stay separate files, matching `DepartmentSelect`/`PositionSelect`.
- The one intentional exception to per-entity duplication: `list-table-skeleton.tsx` (Task 1) is shared by both tabs — it is purely presentational, takes no props, and carries no domain type.

---

### Task 1: Shared table-loading skeleton

**Files:**
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_components/list-table-skeleton.tsx`

**Interfaces:**
- Consumes: `Skeleton` (existing, `frontend/components/ui/skeleton.tsx`); `Table`/`TableBody`/`TableCell`/`TableHead`/`TableHeader`/`TableRow` (existing, `frontend/components/ui/table.tsx`).
- Produces: `ListTableSkeleton(): JSX.Element` — a named export, no props. Consumed by Task 5's `department-tab.tsx` and Task 9's `position-tab.tsx`.

- [ ] **Step 1: Create `frontend/app/dashboard/internal-employees/departments-positions/_components/list-table-skeleton.tsx`**

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

export function ListTableSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border shadow-md">
            <Table>
                <TableHeader className="bg-[#F7F8FA]">
                    <TableRow>
                        <TableHead className="px-4 py-3">
                            <Skeleton className="h-4 w-32" />
                        </TableHead>
                        <TableHead className="px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                        </TableHead>
                        <TableHead className="px-4 py-3">
                            <Skeleton className="h-4 w-16" />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
                        <TableRow key={rowIndex} className="even:bg-[#F7F8FA] odd:bg-white">
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-32" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <div className="flex justify-center gap-1.5">
                                    <Skeleton className="size-8 rounded-md" />
                                    <Skeleton className="size-8 rounded-md" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 3: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/internal-employees/departments-positions/_components/list-table-skeleton.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 2: Department data layer — types, API calls, query hook, mutations

**Files:**
- Modify: `frontend/lib/internal-profiles/types.ts`
- Modify: `frontend/lib/internal-profiles/api.ts`
- Modify: `frontend/lib/internal-profiles/queries/useDepartmentList.ts` (currently an empty file)
- Create: `frontend/lib/internal-profiles/mutations/useInvalidateDepartments.ts`
- Create: `frontend/lib/internal-profiles/mutations/useCreateDepartment.ts`
- Create: `frontend/lib/internal-profiles/mutations/useUpdateDepartment.ts`
- Create: `frontend/lib/internal-profiles/mutations/useDeleteDepartment.ts`

**Interfaces:**
- Consumes: `Department` type (existing, `frontend/lib/internal-profiles/types.ts`); `api` axios instance (existing, `frontend/lib/internal-profiles/api.ts` imports it from `../api`).
- Produces: `CreateDepartmentPayload = { name: string }`, `UpdateDepartmentPayload` (same shape); `fetchDepartmentList(): Promise<Department[]>`, `createDepartment(payload): Promise<Department>`, `updateDepartment(id, payload): Promise<Department>`, `deleteDepartment(id): Promise<void>`; `useDepartmentList(): UseQueryResult<Department[]>`; `useCreateDepartment()`, `useUpdateDepartment(id: number)`, `useDeleteDepartment()` mutation hooks. Consumed by Task 3's form hooks, Task 4's dialogs, and Task 5's `department-tab.tsx`.

- [ ] **Step 1: Add Department payload types to `frontend/lib/internal-profiles/types.ts`**

Append at the end of the file, after `export type UpdateInternalProfilePayload = CreateInternalProfilePayload;`:

```ts

export interface CreateDepartmentPayload {
  name: string;
}

export type UpdateDepartmentPayload = CreateDepartmentPayload;
```

- [ ] **Step 2: Add Department CRUD calls to `frontend/lib/internal-profiles/api.ts`**

Change the type import block from:

```ts
import { api } from "../api";
import {
  CreateInternalProfilePayload,
  Department,
  InternalProfile,
  InternalProfileSortBy,
  InternalProfileSortDirection,
  PaginatedUserList,
  Position,
  UpdateInternalProfilePayload,
} from "./types";
```

to:

```ts
import { api } from "../api";
import {
  CreateDepartmentPayload,
  CreateInternalProfilePayload,
  Department,
  InternalProfile,
  InternalProfileSortBy,
  InternalProfileSortDirection,
  PaginatedUserList,
  Position,
  UpdateDepartmentPayload,
  UpdateInternalProfilePayload,
} from "./types";
```

Append at the end of the file, after `fetchPositionOptions`:

```ts

export async function fetchDepartmentList(): Promise<Department[]> {
  const { data } = await api.get("/api/v1/dashboard/departments");
  return data.data;
}

export async function createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
  const { data } = await api.post<{ data: Department }>("/api/v1/dashboard/departments", payload);
  return data.data;
}

export async function updateDepartment(id: number, payload: UpdateDepartmentPayload): Promise<Department> {
  const { data } = await api.patch<{ data: Department }>(`/api/v1/dashboard/departments/${id}`, payload);
  return data.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/departments/${id}`);
}
```

- [ ] **Step 3: Fill in `frontend/lib/internal-profiles/queries/useDepartmentList.ts`**

This file exists and is currently empty. Write:

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchDepartmentList } from "../api";

export function useDepartmentList() {
  return useQuery({
    queryKey: ["departments", "list"],
    queryFn: fetchDepartmentList,
  });
}
```

- [ ] **Step 4: Create `frontend/lib/internal-profiles/mutations/useInvalidateDepartments.ts`**

```ts
import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateDepartments() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["departments"] });
}
```

This invalidates every query keyed under `["departments", ...]`, including `["departments", "select"]` (the dropdown used by the internal-profile form), so that list stays in sync after create/edit/delete here too.

- [ ] **Step 5: Create `frontend/lib/internal-profiles/mutations/useCreateDepartment.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { createDepartment } from "@/lib/internal-profiles/api";
import type { CreateDepartmentPayload } from "@/lib/internal-profiles/types";
import { useInvalidateDepartments } from "./useInvalidateDepartments";

export function useCreateDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) => createDepartment(payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 6: Create `frontend/lib/internal-profiles/mutations/useUpdateDepartment.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { updateDepartment } from "@/lib/internal-profiles/api";
import type { UpdateDepartmentPayload } from "@/lib/internal-profiles/types";
import { useInvalidateDepartments } from "./useInvalidateDepartments";

export function useUpdateDepartment(id: number) {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (payload: UpdateDepartmentPayload) => updateDepartment(id, payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 7: Create `frontend/lib/internal-profiles/mutations/useDeleteDepartment.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { deleteDepartment } from "@/lib/internal-profiles/api";
import { useInvalidateDepartments } from "./useInvalidateDepartments";

export function useDeleteDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 8: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 9: Stage the changes**

```bash
git status --short
git add frontend/lib/internal-profiles/types.ts frontend/lib/internal-profiles/api.ts frontend/lib/internal-profiles/queries/useDepartmentList.ts frontend/lib/internal-profiles/mutations/useInvalidateDepartments.ts frontend/lib/internal-profiles/mutations/useCreateDepartment.ts frontend/lib/internal-profiles/mutations/useUpdateDepartment.ts frontend/lib/internal-profiles/mutations/useDeleteDepartment.ts
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 3: Department form schema and form hooks

**Files:**
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_schemas/schema.ts`
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-department-form.ts`
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-edit-department-form.ts`

**Interfaces:**
- Consumes: `useCreateDepartment()`, `useUpdateDepartment(id)` (Task 2); `CreateDepartmentPayload`, `UpdateDepartmentPayload` (Task 2, `frontend/lib/internal-profiles/types.ts`).
- Produces: `DepartmentFormSchema` (zod), `DepartmentFormValues = { name: string }`; `useDepartmentForm(onSubmitted: () => void)` returning `{ ...form, onSubmit, isSubmitting }`; `useEditDepartmentForm(id: number, onSubmitted: () => void, initialValues: DepartmentFormValues)` with the same return shape. Consumed by Task 4's `department-form-dialog.tsx`/`edit-department-dialog.tsx`.

- [ ] **Step 1: Create `frontend/app/dashboard/internal-employees/departments-positions/_schemas/schema.ts`**

```ts
import { z } from "zod";

export const DepartmentFormSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อแผนก"),
});

export type DepartmentFormValues = z.infer<typeof DepartmentFormSchema>;
```

- [ ] **Step 2: Create `frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-department-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateDepartment } from "@/lib/internal-profiles/mutations/useCreateDepartment";
import type { CreateDepartmentPayload } from "@/lib/internal-profiles/types";
import { DepartmentFormSchema, type DepartmentFormValues } from "../_schemas/schema";

function getErrorMessage(error: unknown): string {
  const fieldErrors =
    isAxiosError(error) && error.response?.status === 422
      ? (error.response.data as { errors?: Record<string, string[]> }).errors
      : undefined;

  const message = fieldErrors
    ? Object.values(fieldErrors)[0]?.[0]
    : isAxiosError(error)
      ? (error.response?.data as { message?: string } | undefined)?.message
      : undefined;

  return message ?? "สร้างแผนกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

const DEFAULT_VALUES: DepartmentFormValues = {
  name: "",
};

export function useDepartmentForm(onSubmitted: () => void) {
  const createDepartmentMutation = useCreateDepartment();

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreateDepartmentPayload = { name: values.name };

    const promise = createDepartmentMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังสร้างแผนก...",
      success: () => {
        form.reset(DEFAULT_VALUES);
        onSubmitted();
        return "สร้างแผนกสำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createDepartmentMutation.isPending,
  };
}
```

- [ ] **Step 3: Create `frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-edit-department-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateDepartment } from "@/lib/internal-profiles/mutations/useUpdateDepartment";
import type { UpdateDepartmentPayload } from "@/lib/internal-profiles/types";
import { DepartmentFormSchema, type DepartmentFormValues } from "../_schemas/schema";

function getErrorMessage(error: unknown): string {
  const fieldErrors =
    isAxiosError(error) && error.response?.status === 422
      ? (error.response.data as { errors?: Record<string, string[]> }).errors
      : undefined;

  const message = fieldErrors
    ? Object.values(fieldErrors)[0]?.[0]
    : isAxiosError(error)
      ? (error.response?.data as { message?: string } | undefined)?.message
      : undefined;

  return message ?? "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useEditDepartmentForm(
  id: number,
  onSubmitted: () => void,
  initialValues: DepartmentFormValues,
) {
  const updateDepartmentMutation = useUpdateDepartment(id);

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: UpdateDepartmentPayload = { name: values.name };

    const promise = updateDepartmentMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังบันทึกข้อมูล...",
      success: () => {
        onSubmitted();
        return "บันทึกข้อมูลสำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateDepartmentMutation.isPending,
  };
}
```

- [ ] **Step 4: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 5: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/internal-employees/departments-positions/_schemas/schema.ts frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-department-form.ts frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-edit-department-form.ts
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 4: Department dialogs (create / edit / delete)

**Files:**
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_components/department-form-dialog.tsx`
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_components/edit-department-dialog.tsx`
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_components/delete-department-dialog.tsx`

**Interfaces:**
- Consumes: `useDepartmentForm`, `useEditDepartmentForm` (Task 3); `useDeleteDepartment()` (Task 2); `Department` type (existing, `frontend/lib/internal-profiles/types.ts`); `InputField` (existing, `frontend/components/input-field.tsx`); `Dialog*`, `AlertDialog*`, `Input`, `Button` (existing, `frontend/components/ui/`).
- Produces: `DepartmentFormDialog(): JSX.Element` (default export, no props). `EditDepartmentDialog({ department: Department }): JSX.Element` (default export). `DeleteDepartmentDialog({ department: Department }): JSX.Element` (default export). Consumed by Task 5's `department-tab.tsx` (edit/delete) and Task 10's `page.tsx` (create).

- [ ] **Step 1: Create `frontend/app/dashboard/internal-employees/departments-positions/_components/department-form-dialog.tsx`**

```tsx
"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import { useDepartmentForm } from "../_hooks/use-department-form";

export default function DepartmentFormDialog() {
    const [open, setOpen] = useState(false);
    const { register, onSubmit, reset, isSubmitting, formState: { errors } } = useDepartmentForm(() => setOpen(false));

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset();
            }}
        >
            <DialogTrigger render={<Button className="font-bold tracking-wider bg-red-700 text-white flex-1 hover:bg-red-700 h-10" />}>
                <Plus />
                <p>เพิ่มแผนก</p>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>สร้างแผนก</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <InputField label="ชื่อแผนก" error={errors.name?.message}>
                        <Input
                            {...register("name")}
                            aria-invalid={!!errors.name}
                            className="h-10 rounded-sm"
                        />
                    </InputField>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                            สร้างแผนก
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 2: Create `frontend/app/dashboard/internal-employees/departments-positions/_components/edit-department-dialog.tsx`**

```tsx
"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import type { Department } from "@/lib/internal-profiles/types";
import { useEditDepartmentForm } from "../_hooks/use-edit-department-form";

export default function EditDepartmentDialog({ department }: { department: Department }) {
    const [open, setOpen] = useState(false);
    const initialValues = { name: department.name };

    const { register, onSubmit, reset, isSubmitting, formState: { errors } } =
        useEditDepartmentForm(department.id, () => setOpen(false), initialValues);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset(initialValues);
            }}
        >
            <DialogTrigger render={<Button variant="outline" aria-label="แก้ไขแผนก" className="size-8 px-1.5 pt-px rounded-md bg-white" />}>
                <Pencil className="w-4 h-4 text-gray-500" />
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>แก้ไขแผนก</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <InputField label="ชื่อแผนก" error={errors.name?.message}>
                        <Input
                            {...register("name")}
                            aria-invalid={!!errors.name}
                            className="h-10 rounded-sm"
                        />
                    </InputField>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                            บันทึกการแก้ไข
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 3: Create `frontend/app/dashboard/internal-employees/departments-positions/_components/delete-department-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteDepartment } from "@/lib/internal-profiles/mutations/useDeleteDepartment";
import type { Department } from "@/lib/internal-profiles/types";

function getErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ลบแผนกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeleteDepartmentDialog({ department }: { department: Department }) {
    const [open, setOpen] = useState(false);
    const deleteDepartmentMutation = useDeleteDepartment();

    const handleDelete = () => {
        toast.promise(deleteDepartmentMutation.mutateAsync(department.id), {
            loading: "กำลังลบแผนก...",
            success: () => {
                setOpen(false);
                return "ลบแผนกสำเร็จ";
            },
            error: getErrorMessage,
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
                render={
                    <Button
                        variant="outline"
                        aria-label="ลบแผนก"
                        className="size-8 px-1.5 pt-px rounded-md bg-white"
                    />
                }
            >
                <Trash2 className="w-4 h-4 text-red-600" />
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>ลบแผนก</AlertDialogTitle>
                    <AlertDialogDescription>
                        ต้องการลบแผนก &quot;{department.name}&quot; ใช่หรือไม่?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteDepartmentMutation.isPending}
                        className="bg-red-700 text-white hover:bg-red-600"
                        onClick={handleDelete}
                    >
                        ลบแผนก
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
```

- [ ] **Step 4: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 5: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/internal-employees/departments-positions/_components/department-form-dialog.tsx frontend/app/dashboard/internal-employees/departments-positions/_components/edit-department-dialog.tsx frontend/app/dashboard/internal-employees/departments-positions/_components/delete-department-dialog.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 5: Department tab UI

**Files:**
- Modify: `frontend/app/dashboard/internal-employees/departments-positions/_components/department-tab.tsx` (currently a broken stub — calls a `useDepartment()` hook that doesn't exist)

**Interfaces:**
- Consumes: `useDepartmentList()` (Task 2); `ListTableSkeleton` (Task 1); `EditDepartmentDialog`, `DeleteDepartmentDialog` (Task 4); `SearchInput` (existing, `frontend/components/search-input.tsx`).
- Produces: `DepartmentTab(): JSX.Element` (default export, no props) — already imported by `page.tsx` as `<DepartmentTab />`, no wiring changes needed there for this task.

- [ ] **Step 1: Replace the full contents of `frontend/app/dashboard/internal-employees/departments-positions/_components/department-tab.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { useDepartmentList } from "@/lib/internal-profiles/queries/useDepartmentList";
import { ListTableSkeleton } from "./list-table-skeleton";
import EditDepartmentDialog from "./edit-department-dialog";
import DeleteDepartmentDialog from "./delete-department-dialog";

export default function DepartmentTab() {
    const [search, setSearch] = useState("");
    const { data: departments, isPending, isError } = useDepartmentList();

    const visible = useMemo(() => {
        const list = departments ?? [];
        const query = search.trim().toLowerCase();
        if (!query) return list;
        return list.filter((department) => department.name.toLowerCase().includes(query));
    }, [departments, search]);

    if (isPending) {
        return (
            <div className="flex flex-col gap-4 pt-4">
                <ListTableSkeleton />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pt-4">
            <SearchInput value={search} onValueChange={setSearch} placeholder="ค้นหาแผนก" className="lg:max-w-xs" />

            {isError ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    ไม่สามารถโหลดข้อมูลแผนกได้ กรุณาลองใหม่อีกครั้ง
                </p>
            ) : visible.length > 0 ? (
                <div className="overflow-hidden rounded-xl border shadow-md">
                    <Table>
                        <TableHeader className="bg-[#F7F8FA]">
                            <TableRow>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide">ชื่อแผนก</TableHead>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide w-40">จำนวนพนักงาน</TableHead>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide w-20 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((department) => (
                                <TableRow key={department.id} className="even:bg-[#F7F8FA] odd:bg-white">
                                    <TableCell className="px-4 py-3 text-gray-700 font-bold">{department.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-gray-700">{department.internalProfilesCount ?? 0}</TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex justify-center gap-1.5">
                                            <EditDepartmentDialog department={department} />
                                            <DeleteDepartmentDialog department={department} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {search ? "ไม่พบแผนกที่ตรงกับคำค้นหา" : "ยังไม่มีแผนกในระบบ"}
                </p>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 3: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/internal-employees/departments-positions/_components/department-tab.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 6: Position data layer — types, API calls, query hook, mutations

**Files:**
- Modify: `frontend/lib/internal-profiles/types.ts`
- Modify: `frontend/lib/internal-profiles/api.ts`
- Create: `frontend/lib/internal-profiles/queries/usePositionList.ts`
- Create: `frontend/lib/internal-profiles/mutations/useInvalidatePositions.ts`
- Create: `frontend/lib/internal-profiles/mutations/useCreatePosition.ts`
- Create: `frontend/lib/internal-profiles/mutations/useUpdatePosition.ts`
- Create: `frontend/lib/internal-profiles/mutations/useDeletePosition.ts`

**Interfaces:**
- Consumes: `Position` type (existing, `frontend/lib/internal-profiles/types.ts`); `api` axios instance (existing).
- Produces: `CreatePositionPayload = { name: string }`, `UpdatePositionPayload` (same shape); `fetchPositionList(): Promise<Position[]>`, `createPosition(payload): Promise<Position>`, `updatePosition(id, payload): Promise<Position>`, `deletePosition(id): Promise<void>`; `usePositionList(): UseQueryResult<Position[]>`; `useCreatePosition()`, `useUpdatePosition(id: number)`, `useDeletePosition()` mutation hooks. Consumed by Task 7's form hooks, Task 8's dialogs, and Task 9's `position-tab.tsx`. Mirrors Task 2 exactly, `Department` → `Position`.

- [ ] **Step 1: Add Position payload types to `frontend/lib/internal-profiles/types.ts`**

Append at the end of the file, after the `UpdateDepartmentPayload` type added in Task 2:

```ts

export interface CreatePositionPayload {
  name: string;
}

export type UpdatePositionPayload = CreatePositionPayload;
```

- [ ] **Step 2: Add Position CRUD calls to `frontend/lib/internal-profiles/api.ts`**

Change the type import block from:

```ts
import { api } from "../api";
import {
  CreateDepartmentPayload,
  CreateInternalProfilePayload,
  Department,
  InternalProfile,
  InternalProfileSortBy,
  InternalProfileSortDirection,
  PaginatedUserList,
  Position,
  UpdateDepartmentPayload,
  UpdateInternalProfilePayload,
} from "./types";
```

to:

```ts
import { api } from "../api";
import {
  CreateDepartmentPayload,
  CreateInternalProfilePayload,
  CreatePositionPayload,
  Department,
  InternalProfile,
  InternalProfileSortBy,
  InternalProfileSortDirection,
  PaginatedUserList,
  Position,
  UpdateDepartmentPayload,
  UpdateInternalProfilePayload,
  UpdatePositionPayload,
} from "./types";
```

Append at the end of the file, after the `deleteDepartment` function added in Task 2:

```ts

export async function fetchPositionList(): Promise<Position[]> {
  const { data } = await api.get("/api/v1/dashboard/positions");
  return data.data;
}

export async function createPosition(payload: CreatePositionPayload): Promise<Position> {
  const { data } = await api.post<{ data: Position }>("/api/v1/dashboard/positions", payload);
  return data.data;
}

export async function updatePosition(id: number, payload: UpdatePositionPayload): Promise<Position> {
  const { data } = await api.patch<{ data: Position }>(`/api/v1/dashboard/positions/${id}`, payload);
  return data.data;
}

export async function deletePosition(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/positions/${id}`);
}
```

- [ ] **Step 3: Create `frontend/lib/internal-profiles/queries/usePositionList.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchPositionList } from "../api";

export function usePositionList() {
  return useQuery({
    queryKey: ["positions", "list"],
    queryFn: fetchPositionList,
  });
}
```

- [ ] **Step 4: Create `frontend/lib/internal-profiles/mutations/useInvalidatePositions.ts`**

```ts
import { useQueryClient } from "@tanstack/react-query";

export function useInvalidatePositions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["positions"] });
}
```

- [ ] **Step 5: Create `frontend/lib/internal-profiles/mutations/useCreatePosition.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { createPosition } from "@/lib/internal-profiles/api";
import type { CreatePositionPayload } from "@/lib/internal-profiles/types";
import { useInvalidatePositions } from "./useInvalidatePositions";

export function useCreatePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: (payload: CreatePositionPayload) => createPosition(payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 6: Create `frontend/lib/internal-profiles/mutations/useUpdatePosition.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { updatePosition } from "@/lib/internal-profiles/api";
import type { UpdatePositionPayload } from "@/lib/internal-profiles/types";
import { useInvalidatePositions } from "./useInvalidatePositions";

export function useUpdatePosition(id: number) {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: (payload: UpdatePositionPayload) => updatePosition(id, payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 7: Create `frontend/lib/internal-profiles/mutations/useDeletePosition.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { deletePosition } from "@/lib/internal-profiles/api";
import { useInvalidatePositions } from "./useInvalidatePositions";

export function useDeletePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: (id: number) => deletePosition(id),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 8: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 9: Stage the changes**

```bash
git status --short
git add frontend/lib/internal-profiles/types.ts frontend/lib/internal-profiles/api.ts frontend/lib/internal-profiles/queries/usePositionList.ts frontend/lib/internal-profiles/mutations/useInvalidatePositions.ts frontend/lib/internal-profiles/mutations/useCreatePosition.ts frontend/lib/internal-profiles/mutations/useUpdatePosition.ts frontend/lib/internal-profiles/mutations/useDeletePosition.ts
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 7: Position form schema and form hooks

**Files:**
- Modify: `frontend/app/dashboard/internal-employees/departments-positions/_schemas/schema.ts`
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-position-form.ts`
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-edit-position-form.ts`

**Interfaces:**
- Consumes: `useCreatePosition()`, `useUpdatePosition(id)` (Task 6); `CreatePositionPayload`, `UpdatePositionPayload` (Task 6, `frontend/lib/internal-profiles/types.ts`).
- Produces: `PositionFormSchema` (zod), `PositionFormValues = { name: string }`; `usePositionForm(onSubmitted: () => void)`; `useEditPositionForm(id: number, onSubmitted: () => void, initialValues: PositionFormValues)`. Consumed by Task 8's `position-form-dialog.tsx`/`edit-position-dialog.tsx`. Mirrors Task 3 exactly, `Department` → `Position`.

- [ ] **Step 1: Append `PositionFormSchema` to `frontend/app/dashboard/internal-employees/departments-positions/_schemas/schema.ts`**

Append at the end of the file:

```ts

export const PositionFormSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อตำแหน่ง"),
});

export type PositionFormValues = z.infer<typeof PositionFormSchema>;
```

- [ ] **Step 2: Create `frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-position-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreatePosition } from "@/lib/internal-profiles/mutations/useCreatePosition";
import type { CreatePositionPayload } from "@/lib/internal-profiles/types";
import { PositionFormSchema, type PositionFormValues } from "../_schemas/schema";

function getErrorMessage(error: unknown): string {
  const fieldErrors =
    isAxiosError(error) && error.response?.status === 422
      ? (error.response.data as { errors?: Record<string, string[]> }).errors
      : undefined;

  const message = fieldErrors
    ? Object.values(fieldErrors)[0]?.[0]
    : isAxiosError(error)
      ? (error.response?.data as { message?: string } | undefined)?.message
      : undefined;

  return message ?? "สร้างตำแหน่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

const DEFAULT_VALUES: PositionFormValues = {
  name: "",
};

export function usePositionForm(onSubmitted: () => void) {
  const createPositionMutation = useCreatePosition();

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(PositionFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreatePositionPayload = { name: values.name };

    const promise = createPositionMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังสร้างตำแหน่ง...",
      success: () => {
        form.reset(DEFAULT_VALUES);
        onSubmitted();
        return "สร้างตำแหน่งสำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createPositionMutation.isPending,
  };
}
```

- [ ] **Step 3: Create `frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-edit-position-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdatePosition } from "@/lib/internal-profiles/mutations/useUpdatePosition";
import type { UpdatePositionPayload } from "@/lib/internal-profiles/types";
import { PositionFormSchema, type PositionFormValues } from "../_schemas/schema";

function getErrorMessage(error: unknown): string {
  const fieldErrors =
    isAxiosError(error) && error.response?.status === 422
      ? (error.response.data as { errors?: Record<string, string[]> }).errors
      : undefined;

  const message = fieldErrors
    ? Object.values(fieldErrors)[0]?.[0]
    : isAxiosError(error)
      ? (error.response?.data as { message?: string } | undefined)?.message
      : undefined;

  return message ?? "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useEditPositionForm(
  id: number,
  onSubmitted: () => void,
  initialValues: PositionFormValues,
) {
  const updatePositionMutation = useUpdatePosition(id);

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(PositionFormSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: UpdatePositionPayload = { name: values.name };

    const promise = updatePositionMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังบันทึกข้อมูล...",
      success: () => {
        onSubmitted();
        return "บันทึกข้อมูลสำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updatePositionMutation.isPending,
  };
}
```

- [ ] **Step 4: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 5: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/internal-employees/departments-positions/_schemas/schema.ts frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-position-form.ts frontend/app/dashboard/internal-employees/departments-positions/_hooks/use-edit-position-form.ts
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 8: Position dialogs (create / edit / delete)

**Files:**
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_components/position-form-dialog.tsx`
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_components/edit-position-dialog.tsx`
- Create: `frontend/app/dashboard/internal-employees/departments-positions/_components/delete-position-dialog.tsx`

**Interfaces:**
- Consumes: `usePositionForm`, `useEditPositionForm` (Task 7); `useDeletePosition()` (Task 6); `Position` type (existing).
- Produces: `PositionFormDialog(): JSX.Element` (default export). `EditPositionDialog({ position: Position }): JSX.Element` (default export). `DeletePositionDialog({ position: Position }): JSX.Element` (default export). Consumed by Task 9's `position-tab.tsx` (edit/delete) and Task 10's `page.tsx` (create). Mirrors Task 4 exactly, `Department` → `Position`.

- [ ] **Step 1: Create `frontend/app/dashboard/internal-employees/departments-positions/_components/position-form-dialog.tsx`**

```tsx
"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import { usePositionForm } from "../_hooks/use-position-form";

export default function PositionFormDialog() {
    const [open, setOpen] = useState(false);
    const { register, onSubmit, reset, isSubmitting, formState: { errors } } = usePositionForm(() => setOpen(false));

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset();
            }}
        >
            <DialogTrigger render={<Button className="font-bold tracking-wider bg-red-700 text-white flex-1 hover:bg-red-700 h-10" />}>
                <Plus />
                <p>เพิ่มตำแหน่ง</p>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>สร้างตำแหน่ง</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <InputField label="ชื่อตำแหน่ง" error={errors.name?.message}>
                        <Input
                            {...register("name")}
                            aria-invalid={!!errors.name}
                            className="h-10 rounded-sm"
                        />
                    </InputField>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                            สร้างตำแหน่ง
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 2: Create `frontend/app/dashboard/internal-employees/departments-positions/_components/edit-position-dialog.tsx`**

```tsx
"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import type { Position } from "@/lib/internal-profiles/types";
import { useEditPositionForm } from "../_hooks/use-edit-position-form";

export default function EditPositionDialog({ position }: { position: Position }) {
    const [open, setOpen] = useState(false);
    const initialValues = { name: position.name };

    const { register, onSubmit, reset, isSubmitting, formState: { errors } } =
        useEditPositionForm(position.id, () => setOpen(false), initialValues);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) reset(initialValues);
            }}
        >
            <DialogTrigger render={<Button variant="outline" aria-label="แก้ไขตำแหน่ง" className="size-8 px-1.5 pt-px rounded-md bg-white" />}>
                <Pencil className="w-4 h-4 text-gray-500" />
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>แก้ไขตำแหน่ง</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <InputField label="ชื่อตำแหน่ง" error={errors.name?.message}>
                        <Input
                            {...register("name")}
                            aria-invalid={!!errors.name}
                            className="h-10 rounded-sm"
                        />
                    </InputField>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                            บันทึกการแก้ไข
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 3: Create `frontend/app/dashboard/internal-employees/departments-positions/_components/delete-position-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeletePosition } from "@/lib/internal-profiles/mutations/useDeletePosition";
import type { Position } from "@/lib/internal-profiles/types";

function getErrorMessage(error: unknown): string {
    const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
    return message ?? "ลบตำแหน่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function DeletePositionDialog({ position }: { position: Position }) {
    const [open, setOpen] = useState(false);
    const deletePositionMutation = useDeletePosition();

    const handleDelete = () => {
        toast.promise(deletePositionMutation.mutateAsync(position.id), {
            loading: "กำลังลบตำแหน่ง...",
            success: () => {
                setOpen(false);
                return "ลบตำแหน่งสำเร็จ";
            },
            error: getErrorMessage,
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
                render={
                    <Button
                        variant="outline"
                        aria-label="ลบตำแหน่ง"
                        className="size-8 px-1.5 pt-px rounded-md bg-white"
                    />
                }
            >
                <Trash2 className="w-4 h-4 text-red-600" />
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>ลบตำแหน่ง</AlertDialogTitle>
                    <AlertDialogDescription>
                        ต้องการลบตำแหน่ง &quot;{position.name}&quot; ใช่หรือไม่?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deletePositionMutation.isPending}
                        className="bg-red-700 text-white hover:bg-red-600"
                        onClick={handleDelete}
                    >
                        ลบตำแหน่ง
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
```

- [ ] **Step 4: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 5: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/internal-employees/departments-positions/_components/position-form-dialog.tsx frontend/app/dashboard/internal-employees/departments-positions/_components/edit-position-dialog.tsx frontend/app/dashboard/internal-employees/departments-positions/_components/delete-position-dialog.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 9: Position tab UI

**Files:**
- Modify: `frontend/app/dashboard/internal-employees/departments-positions/_components/position-tab.tsx` (currently a placeholder stub)

**Interfaces:**
- Consumes: `usePositionList()` (Task 6); `ListTableSkeleton` (Task 1); `EditPositionDialog`, `DeletePositionDialog` (Task 8); `SearchInput` (existing).
- Produces: `PositionTab(): JSX.Element` (default export, no props) — already imported by `page.tsx` as `<PositionTab />`, no wiring changes needed there for this task. Mirrors Task 5 exactly, `Department` → `Position`.

- [ ] **Step 1: Replace the full contents of `frontend/app/dashboard/internal-employees/departments-positions/_components/position-tab.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { usePositionList } from "@/lib/internal-profiles/queries/usePositionList";
import { ListTableSkeleton } from "./list-table-skeleton";
import EditPositionDialog from "./edit-position-dialog";
import DeletePositionDialog from "./delete-position-dialog";

export default function PositionTab() {
    const [search, setSearch] = useState("");
    const { data: positions, isPending, isError } = usePositionList();

    const visible = useMemo(() => {
        const list = positions ?? [];
        const query = search.trim().toLowerCase();
        if (!query) return list;
        return list.filter((position) => position.name.toLowerCase().includes(query));
    }, [positions, search]);

    if (isPending) {
        return (
            <div className="flex flex-col gap-4 pt-4">
                <ListTableSkeleton />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pt-4">
            <SearchInput value={search} onValueChange={setSearch} placeholder="ค้นหาตำแหน่ง" className="lg:max-w-xs" />

            {isError ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    ไม่สามารถโหลดข้อมูลตำแหน่งได้ กรุณาลองใหม่อีกครั้ง
                </p>
            ) : visible.length > 0 ? (
                <div className="overflow-hidden rounded-xl border shadow-md">
                    <Table>
                        <TableHeader className="bg-[#F7F8FA]">
                            <TableRow>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide">ชื่อตำแหน่ง</TableHead>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide w-40">จำนวนพนักงาน</TableHead>
                                <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide w-20 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((position) => (
                                <TableRow key={position.id} className="even:bg-[#F7F8FA] odd:bg-white">
                                    <TableCell className="px-4 py-3 text-gray-700 font-bold">{position.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-gray-700">{position.internalProfilesCount ?? 0}</TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div className="flex justify-center gap-1.5">
                                            <EditPositionDialog position={position} />
                                            <DeletePositionDialog position={position} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {search ? "ไม่พบตำแหน่งที่ตรงกับคำค้นหา" : "ยังไม่มีตำแหน่งในระบบ"}
                </p>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

- [ ] **Step 3: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/internal-employees/departments-positions/_components/position-tab.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.

---

### Task 10: Wire the "add" dialogs into `page.tsx`, full verification, manual QA

**Files:**
- Modify: `frontend/app/dashboard/internal-employees/departments-positions/page.tsx`

**Interfaces:**
- Consumes: `DepartmentFormDialog` (Task 4), `PositionFormDialog` (Task 8).
- Produces: nothing new — terminal task, wires everything together in the UI.

- [ ] **Step 1: Add the dialog imports**

In `frontend/app/dashboard/internal-employees/departments-positions/page.tsx`, change:

```tsx
import { useState } from "react";
import DepartmentTab from "./_components/department-tab";
import PositionTab from "./_components/position-tab";
```

to:

```tsx
import { useState } from "react";
import DepartmentTab from "./_components/department-tab";
import PositionTab from "./_components/position-tab";
import DepartmentFormDialog from "./_components/department-form-dialog";
import PositionFormDialog from "./_components/position-form-dialog";
```

- [ ] **Step 2: Replace the placeholder header buttons**

Change:

```tsx
                {activeTab === "department" ? "<RoleFormDialog />" : "<PermissionFormDialog />"}
```

to:

```tsx
                {activeTab === "department" ? <DepartmentFormDialog /> : <PositionFormDialog />}
```

- [ ] **Step 3: Type-check, lint, and build**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no new errors

Run (from `frontend/`): `npm run lint`
Expected: no new errors

Run (from `frontend/`): `npm run build`
Expected: build succeeds

- [ ] **Step 4: Disclose manual QA (not automated — no browser tool available in this environment)**

List these steps for the user to verify by hand:
1. Open `dashboard/internal-employees/departments-positions` → "แผนก" tab is active by default → table lists all departments with name + employee count.
2. Type in the search box → table filters by name as you type (client-side, no reload); clearing the search restores the full list.
3. Click "เพิ่มแผนก" → create a department → toast "สร้างแผนกสำเร็จ" → new row appears without a manual refresh.
4. Click the pencil icon on a row → edit the name → toast "บันทึกข้อมูลสำเร็จ" → row updates.
5. Click the trash icon on a department that has 0 employees → confirm → toast "ลบแผนกสำเร็จ" → row disappears.
6. Click the trash icon on a department that still has employees attached → confirm → toast shows the backend's Thai error ("ไม่สามารถลบแผนกที่ยังมีผู้ใช้งานอยู่ได้") → row remains.
7. Switch to the "ตำแหน่ง" tab → repeat steps 1–6 for positions (label: "ไม่สามารถลบตำแหน่งที่ยังมีผู้ใช้งานอยู่ได้").
8. Go to `dashboard/internal-employees` (the main list) → open "เพิ่มพนักงาน" → confirm the department/position dropdowns reflect any create/edit/delete done in steps 3–7 (validates the shared `useInvalidateDepartments`/`useInvalidatePositions` cache-busting).
9. Check both light and dark mode for the tabs, dialogs, and empty/error states.

- [ ] **Step 5: Stage the changes**

```bash
git status --short
git add frontend/app/dashboard/internal-employees/departments-positions/page.tsx
```

Do not run `git commit` — stage only, per this plan's commit policy.
