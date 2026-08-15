# Permission Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open up full CRUD (create/edit/delete) of permissions from the UI, reversing the "permission catalog is fixed from code" stance in `docs/superpowers/specs/2026-08-14-role-permission-management-design.md`. The existing roles page (`/dashboard/users/roles`) becomes `/dashboard/users/roles-permissions` with two tabs — "Role" (existing table, unchanged behavior) and "Permission" (new: list/create/edit/delete). Frontend-only — every new endpoint 404s until a separate backend plan implements the contract in `docs/superpowers/specs/2026-08-15-permission-management-design.md`.

**Architecture:** Extends `lib/user/management/` with 3 permission-CRUD functions/mutations mirroring the existing role-CRUD ones exactly (`createRole`/`updateRole`/`deleteRole` → `createPermission`/`updatePermission`/`deletePermission`), reusing `useInvalidateUsers()` (its `["users"]` root already prefix-covers `["users","permissions"]`). Permission create/edit share one schema/hook/dialog (`PermissionFormDialog`), same precedent as `RoleFormDialog`. `group` is never a form field — it's derived client-side from the prefix before the first `.` in `name` for the live preview, and the spec requires the backend to compute+return it the same way, so the UI never sends or edits it directly. The existing `roles/page.tsx` (table + create dialog + breadcrumb + permission gate) is split into a thin `Tabs` wrapper plus an extracted `role-tab.tsx`, and a new sibling `permission-tab.tsx` — both un-paginated tables built directly from `@tanstack/react-table`'s `getCoreRowModel()`, matching the existing role table's approach (small dataset, no server pagination in the API contract).

**Tech Stack:** Next.js App Router (client components), `react-hook-form` + `@hookform/resolvers/zod` + `zod`, `@tanstack/react-query`, `@tanstack/react-table` (`getCoreRowModel` only), `components/ui/{dialog,alert-dialog,tabs,badge,table}.tsx` (all already in the repo), `sonner`, Tailwind v4.

## Global Constraints

- No test runner is configured in this repo. Verification is `npx tsc --noEmit`, `npm run lint`, and manual dev-server checks (no browser automation tool is available in this environment — do not fake this verification).
- Every new `/api/v1/dashboard/permissions*` call (POST/PATCH/DELETE) 404s until the backend plan for `docs/superpowers/specs/2026-08-15-permission-management-design.md` ships — expected and disclosed in each task's manual-verification step, not a defect.
- Permission `name` validation (client-side, mirrored by backend): required, pattern `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` — must contain exactly a `prefix.action` shape (lowercase letters/digits/underscore on each side of one dot) so `group` can always be derived from it.
- `group` is **never** a form input, never sent in `PermissionFormPayload`, and never persisted client-side as a separate editable value — it is always computed as `name.split(".")[0]` for display/preview.
- Do **not** add any safeguard blocking edit/delete of the original 6 permissions (`vendors.view`, `vendors.review`, `users.create`, `users.update`, `users.updateStatus`, `roles.manage`). This is a deliberate, user-confirmed accepted risk documented in the spec's "ความเสี่ยงที่ยอมรับแล้ว" section — `DeletePermissionDialog` has no `disabledReason`/blocking logic, unlike `DeleteRoleDialog`.
- `frontend/lib/routes.ts` currently has **uncommitted changes from a different, parallel session** (adds `tors`/`tenders`/`reports`/`logs`/`setting` route keys, unrelated to this plan). The task that edits this file MUST use a targeted single-line replacement (edit tool old_string/new_string on just the `roles:` line), never rewrite or regenerate the whole file — doing so would destroy that other session's uncommitted work.
- The route rename must preserve git history: move files with `git mv`, not delete+recreate.
- Do not touch `app/dashboard/users/roles/_components/role-form-dialog.tsx`, `delete-role-dialog.tsx`, `table/columns.tsx`, `_schemas/schema.ts`, or `_hooks/use-role-form.ts` content — they move location (Task 2) but their code is unchanged.

---

### Task 1: Data layer — permission types, API client, mutations

**Files:**
- Modify: `lib/user/management/types.ts`
- Modify: `lib/user/management/api.ts`
- Create: `lib/user/management/mutations/useCreatePermission.ts`
- Create: `lib/user/management/mutations/useUpdatePermission.ts`
- Create: `lib/user/management/mutations/useDeletePermission.ts`

**Interfaces:**
- Consumes: `Permission { name, label, group }` (already exists in `types.ts`), `useInvalidateUsers()` (already exists in `mutations/useInvalidateUsers.ts`).
- Produces (used by Tasks 3–5): `PermissionFormPayload { name, label }`; `createPermission(payload)`, `updatePermission(name, payload)`, `deletePermission(name)`; `useCreatePermission()`, `useUpdatePermission(name)`, `useDeletePermission()`.

- [ ] **Step 1: Edit `lib/user/management/types.ts` — add `PermissionFormPayload`**

Current (end of file, after `RoleFormPayload`):
```ts
export interface RoleFormPayload {
  name: string;
  permissions: string[];
}
```

Add immediately after it:
```ts
export interface RoleFormPayload {
  name: string;
  permissions: string[];
}

export interface PermissionFormPayload {
  name: string;
  label: string;
}
```

(Everything else in the file is unchanged.)

- [ ] **Step 2: Edit `lib/user/management/api.ts` — add the import and 3 new functions**

Current top-of-file import:
```ts
import type {
  CreateUserPayload,
  PaginatedUserList,
  Permission,
  RoleDetail,
  RoleFormPayload,
  UpdateUserPayload,
  UserDetail,
  UserSortBy,
  UserSortDirection,
  UserStatus,
  UserType,
} from "@/lib/user/management/types";
```

Replace with:
```ts
import type {
  CreateUserPayload,
  PaginatedUserList,
  Permission,
  PermissionFormPayload,
  RoleDetail,
  RoleFormPayload,
  UpdateUserPayload,
  UserDetail,
  UserSortBy,
  UserSortDirection,
  UserStatus,
  UserType,
} from "@/lib/user/management/types";
```

Current end of file:
```ts
export async function deleteRole(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/roles/${id}`);
}
```

Add immediately after it:
```ts
export async function deleteRole(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/roles/${id}`);
}

export async function createPermission(payload: PermissionFormPayload): Promise<Permission> {
  const { data } = await api.post<{ data: Permission }>("/api/v1/dashboard/permissions", payload);
  return data.data;
}

export async function updatePermission(name: string, payload: PermissionFormPayload): Promise<Permission> {
  const { data } = await api.patch<{ data: Permission }>(
    `/api/v1/dashboard/permissions/${encodeURIComponent(name)}`,
    payload,
  );
  return data.data;
}

export async function deletePermission(name: string): Promise<void> {
  await api.delete(`/api/v1/dashboard/permissions/${encodeURIComponent(name)}`);
}
```

(`fetchUserList`, `fetchUserDetail`, `createUser`, `updateUser`, `updateUserStatus`, `fetchRoles`, `fetchPermissions`, `createRole`, `updateRole` are unchanged.)

- [ ] **Step 3: Create `lib/user/management/mutations/useCreatePermission.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { createPermission } from "@/lib/user/management/api";
import type { PermissionFormPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useCreatePermission() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: PermissionFormPayload) => createPermission(payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 4: Create `lib/user/management/mutations/useUpdatePermission.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { updatePermission } from "@/lib/user/management/api";
import type { PermissionFormPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdatePermission(name: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: PermissionFormPayload) => updatePermission(name, payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 5: Create `lib/user/management/mutations/useDeletePermission.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { deletePermission } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useDeletePermission() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (name: string) => deletePermission(name),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing any of the 5 files above.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for these files.

- [ ] **Step 8: Commit**

```bash
git add lib/user/management/types.ts lib/user/management/api.ts lib/user/management/mutations/useCreatePermission.ts lib/user/management/mutations/useUpdatePermission.ts lib/user/management/mutations/useDeletePermission.ts
git commit -m "feat(permissions): add permission-CRUD API client and mutations"
```

---

### Task 2: Route rename — `roles` → `roles-permissions`

**Files:**
- Move (git mv, content unchanged): `app/dashboard/users/roles/page.tsx` → `app/dashboard/users/roles-permissions/page.tsx`
- Move (git mv, content unchanged): `app/dashboard/users/roles/_components/table/columns.tsx` → `app/dashboard/users/roles-permissions/_components/table/columns.tsx`
- Move (git mv, content unchanged): `app/dashboard/users/roles/_components/role-form-dialog.tsx` → `app/dashboard/users/roles-permissions/_components/role-form-dialog.tsx`
- Move (git mv, content unchanged): `app/dashboard/users/roles/_components/delete-role-dialog.tsx` → `app/dashboard/users/roles-permissions/_components/delete-role-dialog.tsx`
- Move (git mv, content unchanged): `app/dashboard/users/roles/_schemas/schema.ts` → `app/dashboard/users/roles-permissions/_schemas/schema.ts`
- Move (git mv, content unchanged): `app/dashboard/users/roles/_hooks/use-role-form.ts` → `app/dashboard/users/roles-permissions/_hooks/use-role-form.ts`
- Modify: `lib/routes.ts` (targeted single-line edit only — see Global Constraints)
- Modify: `app/dashboard/users/page.tsx` (button text only)

**Interfaces:**
- Produces (used by Task 6): `routes.dashboards.user.roles` now resolves to `/dashboard/users/roles-permissions`; the moved files' relative imports (`../_hooks/use-role-form`, `./role-form-dialog`, `./table/columns`) are unchanged and still valid because the whole subtree moved together.

- [ ] **Step 1: Move the directory with git mv**

```bash
git mv app/dashboard/users/roles/page.tsx app/dashboard/users/roles-permissions/page.tsx
git mv app/dashboard/users/roles/_components/table/columns.tsx app/dashboard/users/roles-permissions/_components/table/columns.tsx
git mv app/dashboard/users/roles/_components/role-form-dialog.tsx app/dashboard/users/roles-permissions/_components/role-form-dialog.tsx
git mv app/dashboard/users/roles/_components/delete-role-dialog.tsx app/dashboard/users/roles-permissions/_components/delete-role-dialog.tsx
git mv app/dashboard/users/roles/_schemas/schema.ts app/dashboard/users/roles-permissions/_schemas/schema.ts
git mv app/dashboard/users/roles/_hooks/use-role-form.ts app/dashboard/users/roles-permissions/_hooks/use-role-form.ts
```

Expected: `app/dashboard/users/roles/` no longer exists (empty dirs are removed automatically by git); `app/dashboard/users/roles-permissions/` contains the same 6 files with identical content.

- [ ] **Step 2: Edit `lib/routes.ts` — targeted single-line change**

Read the file first to confirm its current state (it has unrelated uncommitted changes from another session — do not let those changes influence this edit or get reverted).

Find this exact line inside `dashboards.user`:
```ts
      roles: "/dashboard/users/roles",
```

Replace only that line with:
```ts
      roles: "/dashboard/users/roles-permissions",
```

Do not modify any other line in this file.

- [ ] **Step 3: Edit `app/dashboard/users/page.tsx` — button text**

Current:
```tsx
          {canManageRoles && (
            <Button variant="outline" render={<Link href={routes.dashboards.user.roles} />} className="h-10">
              จัดการ role
            </Button>
          )}
```

Replace with:
```tsx
          {canManageRoles && (
            <Button variant="outline" render={<Link href={routes.dashboards.user.roles} />} className="h-10">
              จัดการ Role และสิทธิ์
            </Button>
          )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors. In particular, no "module not found" errors for the moved files' relative imports.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/users/roles-permissions lib/routes.ts app/dashboard/users/page.tsx
git status
git commit -m "refactor(roles): rename roles route to roles-permissions"
```

Before committing, check the `git status` output: it must show only the 6 moved files (as renames) plus `lib/routes.ts` and `app/dashboard/users/page.tsx`. If `lib/routes.ts`'s diff shows anything beyond the single `roles:` line change, stop — that means the parallel session's unrelated changes got swept in; re-stage narrowly.

---

### Task 3: Permission form schema + shared create/edit hook + `PermissionFormDialog`

**Files:**
- Create: `app/dashboard/users/roles-permissions/_schemas/permission-schema.ts`
- Create: `app/dashboard/users/roles-permissions/_hooks/use-permission-form.ts`
- Create: `app/dashboard/users/roles-permissions/_components/permission-form-dialog.tsx`

**Interfaces:**
- Consumes: `useCreatePermission`, `useUpdatePermission` (Task 1), `Permission` (existing, `lib/user/management/types.ts`).
- Produces (used by Task 4): `PermissionFormDialog({ permission?: Permission })` — no `permission` prop renders a "สร้าง permission" trigger button; a `permission` prop renders a compact "แก้ไข" icon-button trigger and pre-fills the form.

- [ ] **Step 1: Write `app/dashboard/users/roles-permissions/_schemas/permission-schema.ts`**

```ts
import { z } from "zod";

export const PermissionFormSchema = z.object({
  name: z
    .string()
    .min(1, "กรุณากรอกชื่อ permission")
    .regex(
      /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/,
      "รูปแบบต้องเป็น prefix.action เช่น reports.export (ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น)",
    ),
  label: z.string().min(1, "กรุณากรอก label"),
});

export type PermissionFormValues = z.infer<typeof PermissionFormSchema>;
```

- [ ] **Step 2: Write `app/dashboard/users/roles-permissions/_hooks/use-permission-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreatePermission } from "@/lib/user/management/mutations/useCreatePermission";
import { useUpdatePermission } from "@/lib/user/management/mutations/useUpdatePermission";
import type { Permission } from "@/lib/user/management/types";
import { PermissionFormSchema, type PermissionFormValues } from "../_schemas/permission-schema";

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

  return message ?? "บันทึก permission ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function usePermissionForm(onSubmitted: () => void, permission?: Permission) {
  const createPermissionMutation = useCreatePermission();
  const updatePermissionMutation = useUpdatePermission(permission?.name ?? "");

  const initialValues: PermissionFormValues = permission
    ? { name: permission.name, label: permission.label }
    : { name: "", label: "" };

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(PermissionFormSchema),
    defaultValues: initialValues,
    values: permission ? initialValues : undefined,
  });

  const isSubmitting = createPermissionMutation.isPending || updatePermissionMutation.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const promise = permission
      ? updatePermissionMutation.mutateAsync(values)
      : createPermissionMutation.mutateAsync(values);

    toast.promise(promise, {
      loading: permission ? "กำลังบันทึกการแก้ไข..." : "กำลังสร้าง permission...",
      success: () => {
        if (!permission) form.reset();
        onSubmitted();
        return permission ? "บันทึกการแก้ไขสำเร็จ" : "สร้าง permission สำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting,
  };
}
```

- [ ] **Step 3: Write `app/dashboard/users/roles-permissions/_components/permission-form-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import type { Permission } from "@/lib/user/management/types";
import { usePermissionForm } from "../_hooks/use-permission-form";

export function PermissionFormDialog({ permission }: { permission?: Permission }) {
  const [open, setOpen] = useState(false);
  const { register, watch, onSubmit, reset, isSubmitting, formState: { errors } } =
    usePermissionForm(() => setOpen(false), permission);

  const namePreview = watch("name");
  const groupPreview = namePreview.includes(".") ? namePreview.split(".")[0] : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          permission ? (
            <Button variant="outline" aria-label="แก้ไข permission" className="size-8 px-1.5 pt-px rounded-md bg-white" />
          ) : (
            <Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10" />
          )
        }
      >
        {permission ? <Pencil className="w-4 h-4 text-gray-500" /> : (<><Plus /><p>สร้าง permission</p></>)}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{permission ? "แก้ไข permission" : "สร้าง permission"}</DialogTitle>
          <DialogDescription>
            {permission
              ? `แก้ไขชื่อและคำอธิบายของ permission "${permission.name}"`
              : "ตั้งชื่อและคำอธิบายสำหรับ permission ใหม่"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <InputField
            label="ชื่อ permission"
            error={errors.name?.message}
            badge={
              groupPreview ? (
                <span className="text-xs text-muted-foreground">จะถูกจัดกลุ่มเป็น: {groupPreview}</span>
              ) : undefined
            }
          >
            <Input
              {...register("name")}
              aria-invalid={!!errors.name}
              className="h-11 rounded-sm"
              placeholder="เช่น reports.export"
            />
          </InputField>

          <InputField label="คำอธิบาย (label)" error={errors.label?.message}>
            <Input
              {...register("label")}
              aria-invalid={!!errors.label}
              className="h-11 rounded-sm"
              placeholder="เช่น ส่งออกรายงาน"
            />
          </InputField>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
              {permission ? "บันทึกการแก้ไข" : "สร้าง permission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing the 3 files above.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/users/roles-permissions/_schemas/permission-schema.ts app/dashboard/users/roles-permissions/_hooks/use-permission-form.ts app/dashboard/users/roles-permissions/_components/permission-form-dialog.tsx
git commit -m "feat(permissions): add permission form schema, hook, and create/edit dialog"
```

---

### Task 4: Permission table columns + delete-permission dialog

**Files:**
- Create: `app/dashboard/users/roles-permissions/_components/delete-permission-dialog.tsx`
- Create: `app/dashboard/users/roles-permissions/_components/table/permission-columns.tsx`

**Interfaces:**
- Consumes: `PermissionFormDialog` (Task 3), `useDeletePermission` (Task 1), `Permission` (existing).
- Produces (used by Task 5): `permissionColumns: ColumnDef<Permission>[]`; `DeletePermissionDialog({ permission: Permission })`.

- [ ] **Step 1: Write `app/dashboard/users/roles-permissions/_components/delete-permission-dialog.tsx`**

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
import { useDeletePermission } from "@/lib/user/management/mutations/useDeletePermission";
import type { Permission } from "@/lib/user/management/types";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบ permission ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function DeletePermissionDialog({ permission }: { permission: Permission }) {
  const [open, setOpen] = useState(false);
  const deletePermissionMutation = useDeletePermission();

  const handleDelete = () => {
    toast.promise(deletePermissionMutation.mutateAsync(permission.name), {
      loading: "กำลังลบ permission...",
      success: () => {
        setOpen(false);
        return "ลบ permission สำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="ลบ permission"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 />
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบ permission</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบ permission &quot;{permission.name}&quot; ใช่หรือไม่?
            หากมี role ที่ใช้ permission นี้อยู่ จะถูกถอดออกจากทุก role โดยอัตโนมัติ
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deletePermissionMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบ permission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Note: unlike `DeleteRoleDialog`, there is no `disabledReason`/`Tooltip` wrapper here — deletion is never blocked (see Global Constraints).

- [ ] **Step 2: Write `app/dashboard/users/roles-permissions/_components/table/permission-columns.tsx`**

```tsx
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Permission } from "@/lib/user/management/types"
import { Badge } from "@/components/ui/badge"
import { PermissionFormDialog } from "../permission-form-dialog"
import { DeletePermissionDialog } from "../delete-permission-dialog"

export const permissionColumns: ColumnDef<Permission>[] = [
    {
        id: "name",
        header: "ชื่อ Permission",
        accessorFn: (permission) => permission.name,
        cell: ({ getValue }) => <span className="font-bold">{getValue<string>()}</span>,
    },
    {
        id: "label",
        header: "คำอธิบาย",
        accessorFn: (permission) => permission.label,
    },
    {
        id: "group",
        header: () => <div className="text-center">กลุ่ม</div>,
        accessorFn: (permission) => permission.group,
        cell: ({ getValue }) => (
            <div className="flex justify-center">
                <Badge variant="secondary">{getValue<string>()}</Badge>
            </div>
        ),
    },
    {
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-center gap-1.5">
                <PermissionFormDialog permission={row.original} />
                <DeletePermissionDialog permission={row.original} />
            </div>
        ),
    },
]
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing the 2 files above.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/users/roles-permissions/_components/delete-permission-dialog.tsx "app/dashboard/users/roles-permissions/_components/table/permission-columns.tsx"
git commit -m "feat(permissions): add permission table columns and delete-permission dialog"
```

---

### Task 5: Permission tab component

**Files:**
- Create: `app/dashboard/users/roles-permissions/_components/permission-tab.tsx`

**Interfaces:**
- Consumes: `usePermissions()` (existing, `lib/user/management/queries/usePermissions.ts`), `PermissionFormDialog` (Task 3), `permissionColumns` (Task 4).
- Produces (used by Task 6): `PermissionTab()` — self-contained tab body (create button + table + loading/error/empty states), no props.

- [ ] **Step 1: Write `app/dashboard/users/roles-permissions/_components/permission-tab.tsx`**

```tsx
"use client";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import { PermissionFormDialog } from "./permission-form-dialog";
import { permissionColumns } from "./table/permission-columns";

export function PermissionTab() {
  const { data: permissions, isPending, isError } = usePermissions();

  const sorted = [...(permissions ?? [])].sort(
    (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
  );

  const table = useReactTable({
    data: sorted,
    columns: permissionColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <PermissionFormDialog />
      </div>

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดข้อมูล permission ได้ กรุณาลองใหม่อีกครั้ง
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border shadow-md">
          <Table>
            <TableHeader className="bg-[#F7F8FA]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-4 py-3 font-bold text-gray-600 tracking-wide">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="even:bg-[#F7F8FA] odd:bg-white">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3 text-gray-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={permissionColumns.length} className="h-24 text-center">
                    ยังไม่มี permission ในระบบ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `permission-tab.tsx`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/users/roles-permissions/_components/permission-tab.tsx
git commit -m "feat(permissions): add permission tab component"
```

---

### Task 6: Tabs wrapper — extract `role-tab.tsx`, rewrite `page.tsx`

**Files:**
- Create: `app/dashboard/users/roles-permissions/_components/role-tab.tsx`
- Modify: `app/dashboard/users/roles-permissions/page.tsx`

**Interfaces:**
- Consumes: `useRoles` (existing), `RoleFormDialog` (moved in Task 2), `columns` (moved in Task 2, `table/columns.tsx`), `PermissionTab` (Task 5), `useBreadcrumb`, `useHasPermission`, `routes.dashboards.user.roles`/`.index` (existing).
- Produces: `RoleTab()` — self-contained tab body (create button + table + loading/error/empty states), no props, mirrors `PermissionTab`'s shape.

- [ ] **Step 1: Write `app/dashboard/users/roles-permissions/_components/role-tab.tsx`**

This is the table-rendering body currently inside `page.tsx` (after the move in Task 2), extracted verbatim minus the breadcrumb and the permission gate (those stay page-level, shared by both tabs):

```tsx
"use client";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { RoleFormDialog } from "./role-form-dialog";
import { columns } from "./table/columns";

export function RoleTab() {
  const { data: roles, isPending, isError } = useRoles();

  const table = useReactTable({
    data: roles ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <RoleFormDialog />
      </div>

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดข้อมูล role ได้ กรุณาลองใหม่อีกครั้ง
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border shadow-md">
          <Table>
            <TableHeader className="bg-[#F7F8FA]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-4 py-3 font-bold text-gray-600 tracking-wide">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="even:bg-[#F7F8FA] odd:bg-white">
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
                    ยังไม่มี role ในระบบ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/dashboard/users/roles-permissions/page.tsx` entirely**

Current content (after Task 2's move — same as the original `roles/page.tsx` content, only its location changed):
```tsx
"use client";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useHasPermission } from "@/lib/auth/permissions";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { routes } from "@/lib/routes";
import { RoleFormDialog } from "./_components/role-form-dialog";
import { columns } from "./_components/table/columns";

export default function RolesPage() {
  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    { label: "จัดการ Role" },
  ]);

  const canManageRoles = useHasPermission("roles.manage");
  const { data: roles, isPending, isError } = useRoles();

  const table = useReactTable({
    data: roles ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!canManageRoles) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่มีสิทธิ์เข้าถึงหน้านี้
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">จัดการ Role</h1>
          <p className="text-sm text-gray-600 tracking-wide">
            กำหนด role และ permission สำหรับพนักงานภายใน
          </p>
        </div>
        <RoleFormDialog />
      </div>

      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-6" />
        </div>
      ) : isError ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          ไม่สามารถโหลดข้อมูล role ได้ กรุณาลองใหม่อีกครั้ง
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border shadow-md">
          <Table>
            <TableHeader className="bg-[#F7F8FA]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-4 py-3 font-bold text-gray-600 tracking-wide">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="even:bg-[#F7F8FA] odd:bg-white">
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
                    ยังไม่มี role ในระบบ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

Replace the entire file with:
```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useHasPermission } from "@/lib/auth/permissions";
import { routes } from "@/lib/routes";
import { RoleTab } from "./_components/role-tab";
import { PermissionTab } from "./_components/permission-tab";

export default function RolesPermissionsPage() {
  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    { label: "จัดการ Role และสิทธิ์" },
  ]);

  const canManageRoles = useHasPermission("roles.manage");

  if (!canManageRoles) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่มีสิทธิ์เข้าถึงหน้านี้
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">จัดการ Role และสิทธิ์</h1>
        <p className="text-sm text-gray-600 tracking-wide">
          กำหนด role, permission และความสัมพันธ์ระหว่างกันสำหรับพนักงานภายใน
        </p>
      </div>

      <Tabs defaultValue="role">
        <TabsList className="w-fit">
          <TabsTrigger value="role">Role</TabsTrigger>
          <TabsTrigger value="permission">Permission</TabsTrigger>
        </TabsList>

        <TabsContent value="role">
          <RoleTab />
        </TabsContent>
        <TabsContent value="permission">
          <PermissionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `role-tab.tsx` or `page.tsx`.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, navigate to `/dashboard/users/roles-permissions`.

No browser automation tool is available in this environment — do not fake this verification or hack permissions to force visibility. Confirm the dev server compiles with no errors, and do a careful static trace of:
1. `canManageRoles` gates the whole page the same way it did before the split (single check, now at the top of `page.tsx`, shared by both tabs).
2. Tab "Role" shows `RoleTab` — same table/create/edit/delete behavior as before this plan (unchanged code, just relocated). Confirm nothing regressed versus the pre-move behavior described in `docs/superpowers/plans/2026-08-14-role-permission-management.md` Task 4.
3. Tab "Permission" shows `PermissionTab` — create dialog opens with `name`/`label` inputs and a live "จะถูกจัดกลุ่มเป็น: <prefix>" preview as you type a dotted name; edit/delete icons render per row.
4. `/dashboard/users` → "จัดการ Role และสิทธิ์" button navigates to `/dashboard/users/roles-permissions` (not the old `/dashboard/users/roles`, which should now 404 via Next.js's default not-found handling since that route no longer exists).
5. Full submit-success for permission create/edit/delete can't be verified since the backend endpoints don't exist yet; confirm via Network tab that request shapes match the contract (`POST`/`PATCH /api/v1/dashboard/permissions[/{name}]`, `DELETE /api/v1/dashboard/permissions/{name}`).
6. Light/dark mode both render legibly, including the new Tabs component.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/users/roles-permissions/_components/role-tab.tsx app/dashboard/users/roles-permissions/page.tsx
git commit -m "feat(permissions): split roles-permissions page into Role/Permission tabs"
```

---

## Self-Review Notes

- **Spec coverage:** Spec's "CRUD permission เต็มรูปแบบ" + API contract items 1–4 → Task 1 (client functions) and the backend contract itself (deferred, disclosed in Global Constraints). Spec's "group derive อัตโนมัติ" → the regex in Task 3 (forces a dot so a prefix always exists) + the `namePreview.split(".")[0]` live preview in `PermissionFormDialog` (Task 3) + `permissionColumns`' `group` column reading the server-computed value (Task 4) — never a form field. Spec's route rename + tab layout → Task 2 (move) and Task 6 (tabs). Spec's "ไม่มี safeguard" → `DeletePermissionDialog` (Task 4) has no `disabledReason`, called out explicitly in Global Constraints so no implementer "helpfully" adds one. Spec's Part 1 (`lib/user/management/` additions) → Task 1. Spec's testing checklist (8 items) → covered across Task 6 Step 5's manual verification (items 1–2 covered by Task 2's typecheck already; items 2–8 traced in Task 6).
- **Placeholder scan:** No TBD/TODO; every code block is complete and copy-pasteable. The disclosed backend-404 limitation is explicit in Global Constraints and Task 6's manual-verification step, not silently glossed over.
- **Type consistency:** `PermissionFormPayload { name, label }` (Task 1) matches `PermissionFormValues` (Task 3's zod-inferred type) field-for-field, which matches every `register("...")` call in `PermissionFormDialog` (Task 3). `usePermissionForm(onSubmitted, permission?)`'s signature (Task 3) matches its call site (`usePermissionForm(() => setOpen(false), permission)`). `PermissionFormDialog({ permission?: Permission })` (Task 3) matches its two call sites: zero-arg in `permission-tab.tsx` (Task 5, create mode) and `<PermissionFormDialog permission={row.original} />` in `permission-columns.tsx` (Task 4, edit mode, `row.original` typed `Permission` from `ColumnDef<Permission>`). `DeletePermissionDialog({ permission: Permission })` (Task 4) matches its call site in `permission-columns.tsx` the same way. `useDeletePermission()`'s `mutationFn: (name: string) => deletePermission(name)` (Task 1) matches `deletePermissionMutation.mutateAsync(permission.name)` in `DeletePermissionDialog` (Task 4), since `Permission.name: string`. `RoleTab()`/`PermissionTab()` (Tasks 6, 5) are both zero-prop components matching their call sites in the rewritten `page.tsx` (Task 6). `routes.dashboards.user.roles` (Task 2, value changed) matches its two consumers: `useBreadcrumb`'s href in `page.tsx` (Task 6) and the `Link href` in `app/dashboard/users/page.tsx` (Task 2) — both read the same constant, so the rename propagates without a second edit needed at either call site.
