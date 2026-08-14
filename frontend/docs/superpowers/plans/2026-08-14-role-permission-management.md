# Role/Permission Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a role/permission management sub-route at `/dashboard/users/roles` — a table of roles with create/edit/delete, where each role's permission set is chosen from a fixed backend-provided catalog (not free text). Reachable via a "จัดการ role" button on the existing `/dashboard/users` list page, not a new sidebar item. Frontend-only — every new endpoint 404s until a separate backend plan implements the contract.

**Architecture:** Extends the existing `lib/user/management/` data layer with a permission-catalog query and 3 role-CRUD mutations, reusing the existing `useInvalidateUsers()` invalidator (its `["users"]` root already prefix-covers the new `["users","roles"]`/`["users","permissions"]` query keys). Unlike the Users create/edit split (which needed two separate schemas because the field sets differed), role create and role edit share the exact same field shape (`name` + `permissions[]`), so this plan follows the `AddContactDialog`/`EditContactDialog` precedent: one schema, one hook (`useRoleForm`), one dialog component (`RoleFormDialog`) that branches internally on whether a `role` prop was passed. The roles list is small and unpaginated (no pagination in the API contract), so it does NOT reuse the existing `DataTable` component (which hard-requires server-side pagination props) — instead `roles/page.tsx` builds a lighter, un-paginated table directly from `@tanstack/react-table`'s `getCoreRowModel()` and the same `Table`/`TableHeader`/`TableBody` primitives `DataTable` itself uses. Delete uses the existing `AlertDialog` + `Tooltip`-when-disabled pattern already shipped in `DeleteContactDialog` verbatim.

**Tech Stack:** Next.js App Router (client components), `react-hook-form` + `@hookform/resolvers/zod` + `zod`, `@tanstack/react-query`, `@tanstack/react-table` (`getCoreRowModel` only, no pagination), `components/ui/{dialog,alert-dialog,tooltip,checkbox,badge,table}.tsx` (all already in the repo), `sonner`, Tailwind v4.

## Global Constraints

- No test runner is configured in this repo. Verification is `npx tsc --noEmit`, `npm run lint`, and manual dev-server checks.
- Backend has zero endpoints for this feature yet (confirmed: only `GET /api/v1/dashboard/users`, `GET /api/v1/dashboard/users/{id}`, and the pre-existing lightweight `GET /api/v1/dashboard/roles` exist). Every new call in this plan 404s until `docs/superpowers/specs/2026-08-14-role-permission-management-design.md`'s contract is implemented server-side — expected and disclosed in each task's manual-verification step, not a defect.
- Permission catalog is a **fixed list from the backend** (`GET /api/v1/dashboard/permissions`) — the UI never lets an admin type an arbitrary permission string, only check/uncheck items from that list.
- `lib/user/management/types.ts` currently exports `export interface Role { name: string; }`, consumed only by `lib/user/management/api.ts`'s `fetchRoles()`. This plan **removes** `Role` and replaces it with `RoleDetail` (superset: adds `id`, `permissions`, `userCount`) — confirmed via repo-wide grep that no other file references the `Role` type name directly (dialog components consume `useRoles()`'s inferred return type, never import `Role` by name), so this rename is safe and requires no other call-site changes beyond `types.ts`/`api.ts` themselves.
- Role name validation (client-side, mirrored by backend): required, pattern `^[a-z][a-z0-9_]*$` (lowercase letters/digits/underscore, must start with a letter) — role names are used as real identifiers in the system (assigned to users, checked in gates), not just display labels.
- Do NOT build permission creation, multi-role-per-user, or a "view users with this role" drill-down — all explicitly out of scope per the spec.
- Do NOT add a sidebar nav item for this route. Reachable only via a button on `/dashboard/users`.

---

### Task 1: Data layer — types, API client, permission-catalog query, role-CRUD mutations, route

**Files:**
- Modify: `lib/user/management/types.ts`
- Modify: `lib/user/management/api.ts`
- Modify: `lib/routes.ts`
- Create: `lib/user/management/queries/usePermissions.ts`
- Create: `lib/user/management/mutations/useCreateRole.ts`
- Create: `lib/user/management/mutations/useUpdateRole.ts`
- Create: `lib/user/management/mutations/useDeleteRole.ts`

**Interfaces:**
- Produces (used by Tasks 2–5): `Permission { name, label, group }`, `RoleDetail { id, name, permissions: string[], userCount }`, `RoleFormPayload { name, permissions: string[] }`; `fetchPermissions()`, `createRole(payload)`, `updateRole(id, payload)`, `deleteRole(id)`; `usePermissions()`, `useCreateRole()`, `useUpdateRole(id)`, `useDeleteRole()`; `routes.dashboards.user.roles`.

- [ ] **Step 1: Edit `lib/user/management/types.ts` — replace `Role` with `RoleDetail`/`Permission`/`RoleFormPayload`**

Current (at the end of the file):
```ts
export interface Role {
  name: string;
}
```

Replace with:
```ts
export interface Permission {
  name: string;
  label: string;
  group: string;
}

export interface RoleDetail {
  id: number;
  name: string;
  permissions: string[];
  userCount: number;
}

export interface RoleFormPayload {
  name: string;
  permissions: string[];
}
```

(Everything else in the file — `UserType`, `UserStatus`, `UserListItem`, `InternalProfileFields`, `UserDetail`, pagination types, `CreateUserPayload`, `UpdateAccountPayload`, `UpdateInternalUserPayload`, `UpdateUserPayload` — is unchanged.)

- [ ] **Step 2: Edit `lib/user/management/api.ts` — update the `Role` import/usage, add 3 new functions**

Current top of file:
```ts
import type {
  CreateUserPayload,
  PaginatedUserList,
  Role,
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

Current `fetchRoles`:
```ts
export async function fetchRoles(): Promise<Role[]> {
  const { data } = await api.get<{ data: Role[] }>("/api/v1/dashboard/roles");
  return data.data;
}
```

Replace with:
```ts
export async function fetchRoles(): Promise<RoleDetail[]> {
  const { data } = await api.get<{ data: RoleDetail[] }>("/api/v1/dashboard/roles");
  return data.data;
}

export async function fetchPermissions(): Promise<Permission[]> {
  const { data } = await api.get<{ data: Permission[] }>("/api/v1/dashboard/permissions");
  return data.data;
}

export async function createRole(payload: RoleFormPayload): Promise<RoleDetail> {
  const { data } = await api.post<{ data: RoleDetail }>("/api/v1/dashboard/roles", payload);
  return data.data;
}

export async function updateRole(id: number, payload: RoleFormPayload): Promise<RoleDetail> {
  const { data } = await api.patch<{ data: RoleDetail }>(`/api/v1/dashboard/roles/${id}`, payload);
  return data.data;
}

export async function deleteRole(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/roles/${id}`);
}
```

(`fetchUserList`, `fetchUserDetail`, `createUser`, `updateUser`, `updateUserStatus` are unchanged.)

- [ ] **Step 3: Create `lib/user/management/queries/usePermissions.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchPermissions } from "@/lib/user/management/api";

export function usePermissions() {
  return useQuery({
    queryKey: ["users", "permissions"],
    queryFn: fetchPermissions,
  });
}
```

- [ ] **Step 4: Create `lib/user/management/mutations/useCreateRole.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { createRole } from "@/lib/user/management/api";
import type { RoleFormPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useCreateRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: RoleFormPayload) => createRole(payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 5: Create `lib/user/management/mutations/useUpdateRole.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { updateRole } from "@/lib/user/management/api";
import type { RoleFormPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdateRole(id: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: RoleFormPayload) => updateRole(id, payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 6: Create `lib/user/management/mutations/useDeleteRole.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { deleteRole } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useDeleteRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 7: Edit `lib/routes.ts` — add the roles sub-route**

Current:
```ts
    user: {
      index: "/dashboard/users",
      detail: (id: number | string) => `/dashboard/users/detail?id=${id}`,
    },
```

Replace with:
```ts
    user: {
      index: "/dashboard/users",
      detail: (id: number | string) => `/dashboard/users/detail?id=${id}`,
      roles: "/dashboard/users/roles",
    },
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing any of the 7 files above. (If errors appear referencing `lib/user/management/mutations/useCreateUser.ts`, `useUpdateUser.ts`, `useUpdateUserStatus.ts`, or the dialog components under `app/dashboard/users/`, those files pre-date this task from an earlier session and should already be consistent — do not modify them; report if they are not.)

- [ ] **Step 9: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for these files.

- [ ] **Step 10: Commit**

```bash
git add lib/user/management/types.ts lib/user/management/api.ts lib/routes.ts lib/user/management/queries/usePermissions.ts lib/user/management/mutations/useCreateRole.ts lib/user/management/mutations/useUpdateRole.ts lib/user/management/mutations/useDeleteRole.ts
git commit -m "feat(roles): add permission-catalog and role-CRUD API client and mutations"
```

---

### Task 2: Role form schema + shared create/edit hook + `RoleFormDialog`

**Files:**
- Create: `app/dashboard/users/roles/_schemas/schema.ts`
- Create: `app/dashboard/users/roles/_hooks/use-role-form.ts`
- Create: `app/dashboard/users/roles/_components/role-form-dialog.tsx`

**Interfaces:**
- Consumes: `useCreateRole`, `useUpdateRole`, `usePermissions`, `RoleDetail`, `Permission` (Task 1).
- Produces (used by Tasks 3, 4): `RoleFormDialog({ role?: RoleDetail })` — no `role` prop renders a "สร้าง role" trigger button; a `role` prop renders a compact "แก้ไข" icon-button trigger and pre-fills the form.

- [ ] **Step 1: Write `app/dashboard/users/roles/_schemas/schema.ts`**

```ts
import { z } from "zod";

export const RoleFormSchema = z.object({
  name: z
    .string()
    .min(1, "กรุณากรอกชื่อ role")
    .regex(/^[a-z][a-z0-9_]*$/, "ใช้ได้แค่ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)"),
  permissions: z.array(z.string()).min(1, "กรุณาเลือกอย่างน้อย 1 permission"),
});

export type RoleFormValues = z.infer<typeof RoleFormSchema>;
```

- [ ] **Step 2: Write `app/dashboard/users/roles/_hooks/use-role-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateRole } from "@/lib/user/management/mutations/useCreateRole";
import { useUpdateRole } from "@/lib/user/management/mutations/useUpdateRole";
import type { RoleDetail } from "@/lib/user/management/types";
import { RoleFormSchema, type RoleFormValues } from "../_schemas/schema";

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

  return message ?? "บันทึก role ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useRoleForm(onSubmitted: () => void, role?: RoleDetail) {
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole(role?.id ?? 0);

  const initialValues: RoleFormValues = role
    ? { name: role.name, permissions: role.permissions }
    : { name: "", permissions: [] };

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(RoleFormSchema),
    defaultValues: initialValues,
    values: role ? initialValues : undefined,
  });

  const isSubmitting = createRoleMutation.isPending || updateRoleMutation.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const promise = role
      ? updateRoleMutation.mutateAsync(values)
      : createRoleMutation.mutateAsync(values);

    toast.promise(promise, {
      loading: role ? "กำลังบันทึกการแก้ไข..." : "กำลังสร้าง role...",
      success: () => {
        if (!role) form.reset();
        onSubmitted();
        return role ? "บันทึกการแก้ไขสำเร็จ" : "สร้าง role สำเร็จ";
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

- [ ] **Step 3: Write `app/dashboard/users/roles/_components/role-form-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import type { Permission, RoleDetail } from "@/lib/user/management/types";
import { useRoleForm } from "../_hooks/use-role-form";

export function RoleFormDialog({ role }: { role?: RoleDetail }) {
  const [open, setOpen] = useState(false);
  const { data: permissions } = usePermissions();
  const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } =
    useRoleForm(() => setOpen(false), role);

  const groups = (permissions ?? []).reduce<Record<string, Permission[]>>((acc, permission) => {
    (acc[permission.group] ??= []).push(permission);
    return acc;
  }, {});

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
          role ? (
            <Button variant="outline" aria-label="แก้ไข role" className="size-8 px-1.5 pt-px rounded-md bg-white" />
          ) : (
            <Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10" />
          )
        }
      >
        {role ? <Pencil className="w-4 h-4 text-gray-500" /> : (<><Plus /><p>สร้าง role</p></>)}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{role ? "แก้ไข role" : "สร้าง role"}</DialogTitle>
          <DialogDescription>
            {role ? `แก้ไขชื่อและ permission ของ role "${role.name}"` : "ตั้งชื่อและเลือก permission สำหรับ role ใหม่"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <InputField label="ชื่อ role" error={errors.name?.message}>
            <Input
              {...register("name")}
              aria-invalid={!!errors.name}
              className="h-11 rounded-sm"
              placeholder="เช่น procurement_officer"
            />
          </InputField>

          <Controller
            control={control}
            name="permissions"
            render={({ field: { value, onChange } }) => (
              <InputField label="Permission" error={errors.permissions?.message}>
                <div className="flex flex-col gap-3">
                  {Object.entries(groups).map(([group, items]) => (
                    <div key={group} className="flex flex-col gap-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">{group}</p>
                      {items.map((permission) => (
                        <Field key={permission.name} orientation="horizontal" className="w-fit">
                          <Checkbox
                            id={permission.name}
                            checked={value.includes(permission.name)}
                            onCheckedChange={(checked) =>
                              onChange(
                                checked
                                  ? [...value, permission.name]
                                  : value.filter((name) => name !== permission.name),
                              )
                            }
                            className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
                          />
                          <FieldLabel htmlFor={permission.name} className="font-light tracking-wide text-sm cursor-pointer">
                            {permission.label}
                          </FieldLabel>
                        </Field>
                      ))}
                    </div>
                  ))}
                </div>
              </InputField>
            )}
          />

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
              {role ? "บันทึกการแก้ไข" : "สร้าง role"}
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
git add app/dashboard/users/roles/_schemas/schema.ts app/dashboard/users/roles/_hooks/use-role-form.ts app/dashboard/users/roles/_components/role-form-dialog.tsx
git commit -m "feat(roles): add role form schema, hook, and create/edit dialog"
```

---

### Task 3: Roles table columns + delete-role dialog

**Files:**
- Create: `app/dashboard/users/roles/_components/table/columns.tsx`
- Create: `app/dashboard/users/roles/_components/delete-role-dialog.tsx`

**Interfaces:**
- Consumes: `RoleFormDialog` (Task 2), `useDeleteRole`, `RoleDetail` (Task 1).
- Produces (used by Task 4): `columns: ColumnDef<RoleDetail>[]`; `DeleteRoleDialog({ role: RoleDetail })`.

- [ ] **Step 1: Write `app/dashboard/users/roles/_components/delete-role-dialog.tsx`**

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDeleteRole } from "@/lib/user/management/mutations/useDeleteRole";
import type { RoleDetail } from "@/lib/user/management/types";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ลบ role ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function DeleteRoleDialog({ role }: { role: RoleDetail }) {
  const [open, setOpen] = useState(false);
  const deleteRoleMutation = useDeleteRole();
  const disabledReason =
    role.userCount > 0 ? `ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้ (${role.userCount} คน)` : undefined;

  const handleDelete = () => {
    toast.promise(deleteRoleMutation.mutateAsync(role.id), {
      loading: "กำลังลบ role...",
      success: () => {
        setOpen(false);
        return "ลบ role สำเร็จ";
      },
      error: getErrorMessage,
    });
  };

  const trigger = (
    <AlertDialogTrigger
      render={
        <Button
          variant="ghost"
          size="icon"
          aria-label="ลบ role"
          disabled={!!disabledReason}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed"
        />
      }
    >
      <Trash2 />
    </AlertDialogTrigger>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
            {trigger}
          </TooltipTrigger>
          <TooltipContent>{disabledReason}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบ role</AlertDialogTitle>
          <AlertDialogDescription>
            ต้องการลบ role &quot;{role.name}&quot; ใช่หรือไม่?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteRoleMutation.isPending}
            className="bg-red-700 text-white hover:bg-red-600"
            onClick={handleDelete}
          >
            ลบ role
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Write `app/dashboard/users/roles/_components/table/columns.tsx`**

```tsx
"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { RoleDetail } from "@/lib/user/management/types"
import { Badge } from "@/components/ui/badge"
import { RoleFormDialog } from "../role-form-dialog"
import { DeleteRoleDialog } from "../delete-role-dialog"

export const columns: ColumnDef<RoleDetail>[] = [
    {
        id: "name",
        header: "ชื่อ Role",
        accessorFn: (role) => role.name,
        cell: ({ getValue }) => <span className="font-bold">{getValue<string>()}</span>,
    },
    {
        id: "permissions",
        header: () => <div className="text-center">Permission</div>,
        accessorFn: (role) => role.permissions.length,
        cell: ({ getValue }) => (
            <div className="flex justify-center">
                <Badge variant="secondary">{getValue<number>()} permissions</Badge>
            </div>
        ),
    },
    {
        id: "userCount",
        header: () => <div className="text-center">จำนวนผู้ใช้</div>,
        accessorFn: (role) => role.userCount,
        cell: ({ getValue }) => (
            <div className="flex justify-center">
                <Badge variant="outline">{getValue<number>()} คน</Badge>
            </div>
        ),
    },
    {
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-center gap-1.5">
                <RoleFormDialog role={row.original} />
                <DeleteRoleDialog role={row.original} />
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
git add app/dashboard/users/roles/_components/delete-role-dialog.tsx "app/dashboard/users/roles/_components/table/columns.tsx"
git commit -m "feat(roles): add roles table columns and delete-role dialog"
```

---

### Task 4: Roles list page

**Files:**
- Create: `app/dashboard/users/roles/page.tsx`

**Interfaces:**
- Consumes: `useRoles` (existing, `lib/user/management/queries/useRoles.ts`), `useHasPermission` (existing), `useBreadcrumb` (existing), `RoleFormDialog` (Task 2), `columns` (Task 3), `routes.dashboards.user.roles`/`routes.dashboards.user.index` (Task 1).

- [ ] **Step 1: Write `app/dashboard/users/roles/page.tsx`**

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

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/dashboard/users/roles/page.tsx`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 4: Commit**

```bash
git add "app/dashboard/users/roles/page.tsx"
git commit -m "feat(roles): add roles list page"
```

---

### Task 5: Wire "จัดการ role" button into the Users list page

**Files:**
- Modify: `app/dashboard/users/page.tsx`

**Interfaces:**
- Consumes: `useHasPermission("roles.manage")`, `routes.dashboards.user.roles` (Task 1).

- [ ] **Step 1: Read the current file first**

`app/dashboard/users/page.tsx` was already modified by earlier work in this session (adds `canCreateUser`, `canUpdateStatus`, `canUpdateUser`, `<CreateUserDialog />`). Read the actual current file before editing — the exact "Current" snippets below describe that already-modified state; if what's on disk differs, stop and ask rather than guessing.

- [ ] **Step 2: Add imports**

Current imports block should contain (among others):
```tsx
import { Suspense, useMemo } from "react";
import { Input } from "@/components/ui/input";
...
import { useHasPermission } from "@/lib/auth/permissions";
import { useUserListPage, type UserStatusFilter, type UserTypeFilter } from "./_hooks/use-user-list-page";
import { UserListSkeleton, UserTableSkeleton } from "./_components/user-list-skeleton";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { createColumns } from "./_components/table/columns";
```

Add these 3 new imports alongside the existing ones (exact position doesn't matter, group with the other `@/` imports):
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
```

- [ ] **Step 3: Add the permission check**

Current (inside `UsersPageContent`, near the other `useHasPermission` calls):
```tsx
  const canCreateUser = useHasPermission("users.create");
  const canUpdateStatus = useHasPermission("users.updateStatus");
  const canUpdateUser = useHasPermission("users.update");
```

Replace with:
```tsx
  const canCreateUser = useHasPermission("users.create");
  const canUpdateStatus = useHasPermission("users.updateStatus");
  const canUpdateUser = useHasPermission("users.update");
  const canManageRoles = useHasPermission("roles.manage");
```

- [ ] **Step 4: Add the button next to the existing "+ เพิ่ม user" button**

Current header block:
```tsx
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-sm text-gray-600 tracking-wide">
            รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า
          </p>
        </div>
        {canCreateUser && <CreateUserDialog />}
```

Replace with:
```tsx
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-sm text-gray-600 tracking-wide">
            รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageRoles && (
            <Button variant="outline" render={<Link href={routes.dashboards.user.roles} />} className="h-10">
              จัดการ role
            </Button>
          )}
          {canCreateUser && <CreateUserDialog />}
        </div>
```

(If `Button`/`Link`/`routes` are already imported for some other reason by the time this task runs, don't add duplicate imports — just confirm they resolve to the same modules described in Step 2.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/dashboard/users/page.tsx`.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, navigate to `/dashboard/users`.

No browser automation tool is available in this environment (established, disclosed limitation) — do not fake this verification or hack permissions to force visibility. Instead confirm the dev server compiles the change with no errors, and do a careful static trace of:
1. `canManageRoles` correctly gates the new button (only truthy when `useHasPermission("roles.manage")` is true).
2. Clicking the button (traced statically: `render={<Link href={routes.dashboards.user.roles} />}`) would navigate to `/dashboard/users/roles`.
3. On that route, `RolesPage`'s own `canManageRoles` check independently re-verifies the permission (defense in depth — a user who guesses the URL without the permission sees "ไม่มีสิทธิ์เข้าถึงหน้านี้", not the table).
4. The roles table renders correctly once `useRoles()` resolves (or shows the error/pending states) — confirm via the dev server's compile log that no runtime error occurs when navigating there.
5. Create/edit/delete role dialogs open and their forms render with the expected fields (name input + grouped permission checkboxes) — full submit-success can't be verified since the backend endpoints don't exist yet; confirm via Network tab that the request shape matches the contract (`POST`/`PATCH /api/v1/dashboard/roles`, `DELETE /api/v1/dashboard/roles/{id}`).
6. Light/dark mode both render legibly.

- [ ] **Step 8: Commit**

```bash
git add "app/dashboard/users/page.tsx"
git commit -m "feat(roles): add \"จัดการ role\" entry point to the users list page"
```

---

## Self-Review Notes

- **Spec coverage:** Spec's permission catalog section → Task 1 (`Permission` type, `usePermissions`, seeded via a separate backend plan). API contract items 1–6 → Task 1 (`api.ts` functions) for the client side. Spec Part 1 (`lib/user/management/` additions) → Task 1. Spec Part 2 (roles list page, `RoleFormDialog`, `DeleteRoleDialog`, schema) → Tasks 2, 3, 4. Spec Part 3 (entry-point button, no sidebar item) → Task 5. Spec's error-handling section → `getErrorMessage` helpers in Tasks 2/3, disabled+tooltip delete guard in Task 3. Spec's testing section (no test runner, manual QA checklist items 1–8) → covered across each task's manual-verification steps, consolidated in Task 5 Step 7 for the full navigation flow.
- **Placeholder scan:** No TBD/TODO; every code block is complete. The disclosed backend-404 limitation is explicit in Global Constraints and each manual-verification step, not silently glossed over.
- **Type consistency:** `RoleFormPayload { name, permissions: string[] }` (Task 1) matches `RoleFormValues` (Task 2's zod-inferred type) field-for-field, which matches every `register("...")`/`Controller name="..."` call in `RoleFormDialog` (Task 2). `useRoleForm(onSubmitted, role?)`'s signature (Task 2) matches its call site in `RoleFormDialog` (`useRoleForm(() => setOpen(false), role)`). `RoleFormDialog({ role?: RoleDetail })` (Task 2) matches its two call sites: zero-arg in `roles/page.tsx` (Task 4, create mode) and `<RoleFormDialog role={row.original} />` in `columns.tsx` (Task 3, edit mode, `row.original` typed `RoleDetail` from `ColumnDef<RoleDetail>`). `DeleteRoleDialog({ role: RoleDetail })` (Task 3) matches its call site in `columns.tsx` the same way. `useDeleteRole()`'s `mutationFn: (id: number) => deleteRole(id)` (Task 1) matches `deleteRoleMutation.mutateAsync(role.id)` in `DeleteRoleDialog` (Task 3), since `RoleDetail.id: number`. `routes.dashboards.user.roles` (Task 1) matches its two consumers: `useBreadcrumb`'s href in `roles/page.tsx` (Task 4) and the `Link href` in `page.tsx` (Task 5).
