# User Management: Create/Edit Internal User + Inline Status Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the existing `/dashboard/users` list page and `/dashboard/users/detail` page, add: (1) a dialog to create a new internal (staff) user, (2) a dialog to edit an internal user's profile fields + role, and (3) an inline dropdown in the list table's status column to change any user's status. All three are permission-gated. No backend endpoints exist yet for any of this — this plan is frontend-only and will call endpoints that 404 until a separate backend plan ships them (same situation the original list/detail frontend shipped in, and those endpoints now exist).

**Architecture:** Extends the existing `lib/user/management/` data layer (types, api client, TanStack Query hooks) with 3 new mutations and 1 new query, following the `lib/vendor/approval/` mutation pattern exactly (`useMutation` + a shared `useInvalidateUsers()` invalidator called via `onSettled`). Two new zod-validated RHF forms (`CreateUserSchema`, `UpdateUserSchema`) back two self-contained dialog components (`CreateUserDialog`, `EditUserDialog`), each following the existing `add-contact-dialog.tsx`/`edit-contact-dialog.tsx` pattern verbatim. A new `UserStatusSelect` component replaces the read-only `UserStatusBadge` in the table's status column when the viewer has permission, driven by a hard-coded mirror of the backend's real `UserStatus` state-machine transitions. `columns.tsx` changes from a static array export to a `createColumns(canUpdateStatus)` factory so the list page can pass the permission flag in.

**Tech Stack:** Next.js App Router (client components), `react-hook-form` + `@hookform/resolvers/zod` + `zod`, `@tanstack/react-query`, `components/ui/dialog.tsx` / `select.tsx` / `button.tsx` (Base UI-backed, already in the repo), `sonner` for toasts, Tailwind v4.

## Global Constraints

- No test runner is configured in this repo. Do not add one. Verification is `npx tsc --noEmit`, `npm run lint`, and manual dev-server checks.
- Backend has zero endpoints for create/update/status-change/roles yet (confirmed: only `GET /api/v1/dashboard/users` and `GET /api/v1/dashboard/users/{id}` exist in `backend/routes/api/v1/dashboard/users.php`). Every mutation and `useRoles()` in this plan will get a 404 against the real backend until `docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md`'s contract is implemented server-side. This is expected — manual QA in each task verifies client-side behavior (validation, dialog UX, permission gating, request shape via devtools network tab) and explicitly does not claim a successful save.
- Follow existing form convention verbatim: zod schema + `_hooks/use-<name>-form.ts` (wraps `useForm` with `zodResolver`, returns `{ ...form, onSubmit, isSubmitting }`) + `InputField` (imported from `@/app/(public)/profiles/_components/input-field` — already imported cross-route from `app/dashboard/vendors/detail/page.tsx`, so this is a precedented pattern, not a new one). Reference: `app/(public)/profiles/contract/_hooks/use-add-contact-form.ts`, `app/(public)/profiles/contract/_components/add-contact-dialog.tsx`.
- `CreateUserSchema` and `UpdateUserSchema` are two **independent** `z.object(...)` schemas (not one `.extend()`-ing the other). Do not try to share one generic `<TFieldValues>` form-fields component between the create and edit dialogs — react-hook-form's `Control<T>`/`UseFormRegister<T>` do not reliably type-check when passed across two structurally-different (superset/subset) field-value types in this codebase's TS config, and no existing component in this repo does that. Each dialog owns its own field JSX; the overlap (prefix/firstname/lastname/employeeNo/department/position/phone/role) is duplicated between the two files. This is intentional — see Task 3 and Task 4.
- Prefix `Select` (`นาย`/`นาง`/`นางสาว`, default `"นาย"`) copies the exact pattern already used in `app/(public)/profiles/vendor-info/_components/individual-info-form.tsx:101-120`.
- Mutation query-key invalidation always targets `["users"]` (the root key both `useUserList` and `useUserDetail` share), via a shared `useInvalidateUsers()` hook — mirrors `lib/vendor/approval/mutations/useInvalidateVendors.ts`.
- Permission slugs (exact strings, must match backend contract): `users.create`, `users.update`, `users.updateStatus`. Check via `useHasPermission("...")` from `@/lib/auth/permissions` (already implemented, never yet used anywhere — this plan is its first real caller).
- Status transitions allowed (mirrors `backend/app/Modules/User/Domain/States/UserStatus.php`'s real state machine — do not invent other transitions): `pending→active`, `active→suspended`, `active→inactive`, `suspended→active`, `inactive→active`.

---

### Task 1: Data layer — types, API client, query, mutations

**Files:**
- Modify: `lib/user/management/types.ts`
- Modify: `lib/user/management/api.ts`
- Create: `lib/user/management/queries/useRoles.ts`
- Create: `lib/user/management/mutations/useInvalidateUsers.ts`
- Create: `lib/user/management/mutations/useCreateUser.ts`
- Create: `lib/user/management/mutations/useUpdateUser.ts`
- Create: `lib/user/management/mutations/useUpdateUserStatus.ts`

**Interfaces:**
- Produces (used by Tasks 2, 3, 4, 5): `Role { name: string }`, `CreateUserPayload`, `UpdateUserPayload`, `UserDetail.role: string | null`, `UserDetail.internalProfile: InternalProfileFields | null`; `createUser(payload)`, `updateUser(id, payload)`, `updateUserStatus(id, status)`, `fetchRoles()`; `useRoles()`, `useCreateUser()`, `useUpdateUser(id)`, `useUpdateUserStatus(id)`, `useInvalidateUsers()`.

- [ ] **Step 1: Rewrite `types.ts`**

Current file:
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

Replace with:
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

export interface InternalProfileFields {
  prefix: string | null;
  firstname: string;
  lastname: string;
  employeeNo: string | null;
  department: string | null;
  position: string | null;
  phone: string | null;
}

export interface UserDetail extends UserListItem {
  vendorProfileId: number | null;
  role: string | null;
  internalProfile: InternalProfileFields | null;
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

export interface Role {
  name: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  prefix?: string;
  firstname: string;
  lastname: string;
  employeeNo?: string;
  department?: string;
  position?: string;
  phone?: string;
}

export type UpdateUserPayload = Omit<CreateUserPayload, "username" | "email" | "password">;
```

- [ ] **Step 2: Rewrite `api.ts`**

Current file:
```ts
// These endpoints are a designed-but-not-yet-implemented backend contract.
// See docs/superpowers/specs/2026-08-13-user-management-list-design.md.
// Requests will fail until the backend read-side API plan ships.
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
  return {
    data: data.data,
    meta: {
      currentPage: data.meta.currentPage,
      lastPage: data.meta.lastPage,
      perPage: data.meta.perPage,
      total: data.meta.total,
    },
  };
}

export async function fetchUserDetail(id: number): Promise<UserDetail> {
  const { data } = await api.get<{ data: UserDetail }>(`/api/v1/dashboard/users/${id}`);
  return data.data;
}
```

Replace with:
```ts
// These endpoints are a designed-but-not-yet-implemented backend contract.
// See docs/superpowers/specs/2026-08-13-user-management-list-design.md (list/detail)
// and docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md (create/edit/status/roles).
// Requests will fail until the backend API plan(s) ship.
import { api } from "@/lib/api";
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
  return {
    data: data.data,
    meta: {
      currentPage: data.meta.currentPage,
      lastPage: data.meta.lastPage,
      perPage: data.meta.perPage,
      total: data.meta.total,
    },
  };
}

export async function fetchUserDetail(id: number): Promise<UserDetail> {
  const { data } = await api.get<{ data: UserDetail }>(`/api/v1/dashboard/users/${id}`);
  return data.data;
}

export async function createUser(payload: CreateUserPayload): Promise<UserDetail> {
  const { data } = await api.post<{ data: UserDetail }>("/api/v1/dashboard/users", payload);
  return data.data;
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<UserDetail> {
  const { data } = await api.patch<{ data: UserDetail }>(`/api/v1/dashboard/users/${id}`, payload);
  return data.data;
}

export async function updateUserStatus(id: number, status: UserStatus): Promise<UserStatus> {
  const { data } = await api.patch<{ data: { status: UserStatus } }>(
    `/api/v1/dashboard/users/${id}/status`,
    { status },
  );
  return data.data.status;
}

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await api.get<{ data: Role[] }>("/api/v1/dashboard/roles");
  return data.data;
}
```

- [ ] **Step 3: Create `lib/user/management/queries/useRoles.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchRoles } from "@/lib/user/management/api";

export function useRoles() {
  return useQuery({
    queryKey: ["users", "roles"],
    queryFn: fetchRoles,
  });
}
```

- [ ] **Step 4: Create `lib/user/management/mutations/useInvalidateUsers.ts`**

```ts
import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["users"] });
}
```

- [ ] **Step 5: Create `lib/user/management/mutations/useCreateUser.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { createUser } from "@/lib/user/management/api";
import type { CreateUserPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 6: Create `lib/user/management/mutations/useUpdateUser.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { updateUser } from "@/lib/user/management/api";
import type { UpdateUserPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdateUser(id: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => updateUser(id, payload),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 7: Create `lib/user/management/mutations/useUpdateUserStatus.ts`**

```ts
import { useMutation } from "@tanstack/react-query";
import { updateUserStatus } from "@/lib/user/management/api";
import type { UserStatus } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdateUserStatus(id: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (status: UserStatus) => updateUserStatus(id, status),
    onSettled: invalidate,
  });
}
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing any of the 7 files above.

- [ ] **Step 9: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for these files.

- [ ] **Step 10: Commit**

```bash
git add lib/user/management/types.ts lib/user/management/api.ts lib/user/management/queries/useRoles.ts lib/user/management/mutations/
git commit -m "feat(user): add create/update/status-change API client and mutations"
```

---

### Task 2: Create/edit zod schemas + form hooks

**Files:**
- Create: `app/dashboard/users/_schemas/schema.ts`
- Create: `app/dashboard/users/_hooks/use-create-user-form.ts`
- Create: `app/dashboard/users/_hooks/use-update-user-form.ts`

**Interfaces:**
- Consumes: `useCreateUser`, `useUpdateUser` (Task 1).
- Produces (used by Tasks 3, 4): `CreateUserSchema`, `CreateUserValues`, `UpdateUserSchema`, `UpdateUserValues`; `useCreateUserForm(onSubmitted: () => void)` returns `UseFormReturn<CreateUserValues> & { onSubmit: () => void; isSubmitting: boolean }`; `useUpdateUserForm(id: number, onSubmitted: () => void, initialValues: UpdateUserValues)` returns `UseFormReturn<UpdateUserValues> & { onSubmit: () => void; isSubmitting: boolean }`.

- [ ] **Step 1: Write `app/dashboard/users/_schemas/schema.ts`**

```ts
import { z } from "zod";

export const CreateUserSchema = z.object({
  username: z.string().min(1, "กรุณากรอก username"),
  email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  employeeNo: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "กรุณาเลือก role"),
});

export type CreateUserValues = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  employeeNo: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "กรุณาเลือก role"),
});

export type UpdateUserValues = z.infer<typeof UpdateUserSchema>;
```

- [ ] **Step 2: Write `app/dashboard/users/_hooks/use-create-user-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateUser } from "@/lib/user/management/mutations/useCreateUser";
import { CreateUserSchema, type CreateUserValues } from "../_schemas/schema";

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

  return message ?? "สร้าง user ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useCreateUserForm(onSubmitted: () => void) {
  const createUserMutation = useCreateUser();

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      prefix: "นาย",
      firstname: "",
      lastname: "",
      employeeNo: "",
      department: "",
      position: "",
      phone: "",
      role: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(createUserMutation.mutateAsync(values), {
      loading: "กำลังสร้าง user...",
      success: () => {
        form.reset();
        onSubmitted();
        return "สร้าง user สำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createUserMutation.isPending,
  };
}
```

- [ ] **Step 3: Write `app/dashboard/users/_hooks/use-update-user-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateUser } from "@/lib/user/management/mutations/useUpdateUser";
import { UpdateUserSchema, type UpdateUserValues } from "../_schemas/schema";

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

export function useUpdateUserForm(
  id: number,
  onSubmitted: () => void,
  initialValues: UpdateUserValues,
) {
  const updateUserMutation = useUpdateUser(id);

  const form = useForm<UpdateUserValues>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(updateUserMutation.mutateAsync(values), {
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
    isSubmitting: updateUserMutation.isPending,
  };
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing the 3 files above.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for these files.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/users/_schemas/schema.ts app/dashboard/users/_hooks/use-create-user-form.ts app/dashboard/users/_hooks/use-update-user-form.ts
git commit -m "feat(user): add create/update user form schemas and hooks"
```

---

### Task 3: Create-user dialog + wire into list page

**Files:**
- Create: `app/dashboard/users/_components/create-user-dialog.tsx`
- Modify: `app/dashboard/users/page.tsx`

**Interfaces:**
- Consumes: `useCreateUserForm` (Task 2), `useRoles` (Task 1), `useHasPermission` (existing, `@/lib/auth/permissions`).
- Produces: `CreateUserDialog` — zero-props component rendering its own trigger button + dialog.

- [ ] **Step 1: Write `app/dashboard/users/_components/create-user-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import { useCreateUserForm } from "../_hooks/use-create-user-form";

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
};

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const { data: roles } = useRoles();
  const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } =
    useCreateUserForm(() => setOpen(false));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10" />}>
        <Plus />
        <p>เพิ่ม user</p>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>เพิ่ม user</DialogTitle>
          <DialogDescription>สร้างบัญชี internal user ใหม่สำหรับพนักงานภายใน</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <InputField label="Username" error={errors.username?.message}>
              <Input {...register("username")} aria-invalid={!!errors.username} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="อีเมล" error={errors.email?.message}>
              <Input {...register("email")} type="email" aria-invalid={!!errors.email} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <InputField label="รหัสผ่าน" error={errors.password?.message}>
            <Input {...register("password")} type="password" aria-invalid={!!errors.password} className="h-11 rounded-sm" />
          </InputField>

          <div className="grid md:grid-cols-3 gap-4">
            <Controller
              control={control}
              name="prefix"
              render={({ field: { value, onChange, ...field } }) => (
                <InputField label="คำนำหน้า">
                  <Select value={value || "นาย"} onValueChange={onChange} {...field}>
                    <SelectTrigger className="w-full h-11! rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                      <SelectGroup>
                        <SelectItem value="นาย">นาย</SelectItem>
                        <SelectItem value="นาง">นาง</SelectItem>
                        <SelectItem value="นางสาว">นางสาว</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </InputField>
              )}
            />

            <InputField label="ชื่อ" error={errors.firstname?.message}>
              <Input {...register("firstname")} aria-invalid={!!errors.firstname} className="h-11 rounded-sm" />
            </InputField>

            <InputField label="นามสกุล" error={errors.lastname?.message}>
              <Input {...register("lastname")} aria-invalid={!!errors.lastname} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <InputField label="รหัสพนักงาน" error={errors.employeeNo?.message}>
              <Input {...register("employeeNo")} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="เบอร์โทร" error={errors.phone?.message}>
              <Input {...register("phone")} inputMode="numeric" className="h-11 rounded-sm" />
            </InputField>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <InputField label="แผนก" error={errors.department?.message}>
              <Input {...register("department")} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="ตำแหน่ง" error={errors.position?.message}>
              <Input {...register("position")} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <Controller
            control={control}
            name="role"
            render={({ field: { value, onChange, ...field } }) => (
              <InputField label="บทบาท (Role)" error={errors.role?.message}>
                <Select
                  items={(roles ?? []).map((r) => ({ value: r.name, label: ROLE_LABELS[r.name] ?? r.name }))}
                  value={value}
                  onValueChange={onChange}
                  {...field}
                >
                  <SelectTrigger className="w-full h-11! rounded-sm" aria-invalid={!!errors.role}>
                    <SelectValue placeholder="เลือก role" />
                  </SelectTrigger>
                  <SelectContent side="bottom" alignItemWithTrigger={false}>
                    <SelectGroup>
                      {(roles ?? []).map((r) => (
                        <SelectItem key={r.name} value={r.name}>
                          {ROLE_LABELS[r.name] ?? r.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </InputField>
            )}
          />

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire into `app/dashboard/users/page.tsx` — imports**

Current imports block (top of file):
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
```

Replace with:
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
import { useHasPermission } from "@/lib/auth/permissions";
import { useUserListPage, type UserStatusFilter, type UserTypeFilter } from "./_hooks/use-user-list-page";
import { UserListSkeleton, UserTableSkeleton } from "./_components/user-list-skeleton";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { columns } from "./_components/table/columns";
```

- [ ] **Step 3: Wire into `app/dashboard/users/page.tsx` — header**

Current (inside `UsersPageContent`):
```tsx
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
```

Replace with:
```tsx
function UsersPageContent() {
  useBreadcrumb([{ label: "จัดการผู้ใช้" }]);

  const canCreateUser = useHasPermission("users.create");

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-sm text-gray-600 tracking-wide">
            รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า
          </p>
        </div>
        {canCreateUser && <CreateUserDialog />}
      </div>
```

(The rest of the file — filters, table, empty/error states — is unchanged.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/dashboard/users/_components/create-user-dialog.tsx` or `app/dashboard/users/page.tsx`.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in as an internal user, navigate to `/dashboard/users`.

Verify:
1. If your test account has the `users.create` permission (it won't yet, since the backend doesn't grant it — see caveat in Global Constraints; temporarily mock `useHasPermission` to return `true` if needed to check rendering, then revert): a red "+ เพิ่ม user" button renders top-right of the page header.
2. Clicking it opens the dialog with Username/อีเมล/รหัสผ่าน/คำนำหน้า/ชื่อ/นามสกุล/รหัสพนักงาน/เบอร์โทร/แผนก/ตำแหน่ง/บทบาท fields.
3. Submitting empty shows validation errors under Username, อีเมล, รหัสผ่าน, ชื่อ, นามสกุล, บทบาท (the required fields); คำนำหน้า defaults to "นาย".
4. Filling all required fields and submitting shows a "กำลังสร้าง user..." toast, then (since the backend endpoint doesn't exist yet) an error toast — check the Network tab and confirm the request was `POST /api/v1/dashboard/users` with the correct JSON body shape.
5. Without `users.create` permission, the button does not render at all.
6. Light/dark mode both render legibly.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/users/_components/create-user-dialog.tsx app/dashboard/users/page.tsx
git commit -m "feat(user): add create-user dialog and wire into users list page"
```

---

### Task 4: Edit-user dialog + wire into detail page

**Files:**
- Create: `app/dashboard/users/detail/_components/edit-user-dialog.tsx`
- Modify: `app/dashboard/users/detail/page.tsx`

**Interfaces:**
- Consumes: `useUpdateUserForm` (Task 2), `useRoles` (Task 1), `useHasPermission` (existing), `UserDetail` type (Task 1).
- Produces: `EditUserDialog({ user: UserDetail })` — renders its own trigger button + dialog, pre-filled from `user.internalProfile`/`user.role`.

- [ ] **Step 1: Write `app/dashboard/users/detail/_components/edit-user-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import type { UserDetail } from "@/lib/user/management/types";
import { useUpdateUserForm } from "../../_hooks/use-update-user-form";

const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
};

export function EditUserDialog({ user }: { user: UserDetail }) {
  const [open, setOpen] = useState(false);
  const { data: roles } = useRoles();
  const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } =
    useUpdateUserForm(user.id, () => setOpen(false), {
      prefix: user.internalProfile?.prefix ?? "นาย",
      firstname: user.internalProfile?.firstname ?? "",
      lastname: user.internalProfile?.lastname ?? "",
      employeeNo: user.internalProfile?.employeeNo ?? "",
      department: user.internalProfile?.department ?? "",
      position: user.internalProfile?.position ?? "",
      phone: user.internalProfile?.phone ?? "",
      role: user.role ?? "",
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" aria-label="แก้ไข user" />}>
        <Pencil />
        <p>แก้ไข</p>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>แก้ไข user</DialogTitle>
          <DialogDescription>แก้ไขข้อมูลโปรไฟล์และ role ของ {user.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Controller
              control={control}
              name="prefix"
              render={({ field: { value, onChange, ...field } }) => (
                <InputField label="คำนำหน้า">
                  <Select value={value || "นาย"} onValueChange={onChange} {...field}>
                    <SelectTrigger className="w-full h-11! rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                      <SelectGroup>
                        <SelectItem value="นาย">นาย</SelectItem>
                        <SelectItem value="นาง">นาง</SelectItem>
                        <SelectItem value="นางสาว">นางสาว</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </InputField>
              )}
            />

            <InputField label="ชื่อ" error={errors.firstname?.message}>
              <Input {...register("firstname")} aria-invalid={!!errors.firstname} className="h-11 rounded-sm" />
            </InputField>

            <InputField label="นามสกุล" error={errors.lastname?.message}>
              <Input {...register("lastname")} aria-invalid={!!errors.lastname} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <InputField label="รหัสพนักงาน" error={errors.employeeNo?.message}>
              <Input {...register("employeeNo")} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="เบอร์โทร" error={errors.phone?.message}>
              <Input {...register("phone")} inputMode="numeric" className="h-11 rounded-sm" />
            </InputField>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <InputField label="แผนก" error={errors.department?.message}>
              <Input {...register("department")} className="h-11 rounded-sm" />
            </InputField>
            <InputField label="ตำแหน่ง" error={errors.position?.message}>
              <Input {...register("position")} className="h-11 rounded-sm" />
            </InputField>
          </div>

          <Controller
            control={control}
            name="role"
            render={({ field: { value, onChange, ...field } }) => (
              <InputField label="บทบาท (Role)" error={errors.role?.message}>
                <Select
                  items={(roles ?? []).map((r) => ({ value: r.name, label: ROLE_LABELS[r.name] ?? r.name }))}
                  value={value}
                  onValueChange={onChange}
                  {...field}
                >
                  <SelectTrigger className="w-full h-11! rounded-sm" aria-invalid={!!errors.role}>
                    <SelectValue placeholder="เลือก role" />
                  </SelectTrigger>
                  <SelectContent side="bottom" alignItemWithTrigger={false}>
                    <SelectGroup>
                      {(roles ?? []).map((r) => (
                        <SelectItem key={r.name} value={r.name}>
                          {ROLE_LABELS[r.name] ?? r.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </InputField>
            )}
          />

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>ยกเลิก</DialogClose>
            <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">บันทึกการแก้ไข</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire into `app/dashboard/users/detail/page.tsx` — imports**

Current imports block:
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
```

Replace with:
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
import { useHasPermission } from "@/lib/auth/permissions";
import { routes } from "@/lib/routes";
import { getInitials } from "@/lib/utils";
import { EditUserDialog } from "./_components/edit-user-dialog";
```

- [ ] **Step 3: Wire into `app/dashboard/users/detail/page.tsx` — header buttons**

Current (inside `UserDetailContent`, header + action button area):
```tsx
function UserDetailContent() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("id"));
  const isValidId = Number.isFinite(userId) && userId > 0;

  const { data: user, isPending, isError } = useUserDetail(userId);
  const notFound = !isValidId || (isError && !user) || (!isPending && !user);
```

Replace with:
```tsx
function UserDetailContent() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("id"));
  const isValidId = Number.isFinite(userId) && userId > 0;

  const { data: user, isPending, isError } = useUserDetail(userId);
  const notFound = !isValidId || (isError && !user) || (!isPending && !user);
  const canUpdateUser = useHasPermission("users.update");
```

Then, current:
```tsx
        {user.vendorProfileId && (
          <Button
            type="button"
            variant="outline"
            render={<Link href={routes.dashboards.vendors.detail(user.vendorProfileId)} />}
          >
            ดูข้อมูลผู้ค้า
          </Button>
        )}
      </div>
```

Replace with:
```tsx
        <div className="flex items-center gap-2">
          {user.userType === "internal" && canUpdateUser && <EditUserDialog user={user} />}

          {user.vendorProfileId && (
            <Button
              type="button"
              variant="outline"
              render={<Link href={routes.dashboards.vendors.detail(user.vendorProfileId)} />}
            >
              ดูข้อมูลผู้ค้า
            </Button>
          )}
        </div>
      </div>
```

(The rest of the file — profile info card — is unchanged.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/dashboard/users/detail/_components/edit-user-dialog.tsx` or `app/dashboard/users/detail/page.tsx`.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, navigate to an internal user's detail page (`/dashboard/users/detail?id=<internal-user-id>`).

Verify:
1. With `users.update` permission (mock `useHasPermission` temporarily if the backend hasn't granted it yet, then revert): an outline "แก้ไข" button with a pencil icon renders next to the header.
2. Clicking it opens a dialog pre-filled with the user's current prefix/firstname/lastname/employeeNo/department/position/phone/role (from `user.internalProfile` — if the backend detail endpoint doesn't return `internalProfile` yet, fields fall back to empty strings, which is expected until the backend contract update ships).
3. Clearing "ชื่อ" or "นามสกุล" and submitting shows the required-field error.
4. Submitting valid data shows a "กำลังบันทึกข้อมูล..." toast then an error toast (backend 404 expected) — confirm via Network tab the request is `PATCH /api/v1/dashboard/users/{id}` with the correct body (no username/email/password keys).
5. Navigate to a company/individual user's detail page — no "แก้ไข" button renders even with permission (userType guard).
6. Without `users.update` permission, no "แก้ไข" button renders on an internal user's page either.
7. Light/dark mode both render legibly.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/users/detail/_components/edit-user-dialog.tsx app/dashboard/users/detail/page.tsx
git commit -m "feat(user): add edit-user dialog and wire into user detail page"
```

---

### Task 5: Inline status-change dropdown in the users table

**Files:**
- Create: `components/user-status-select.tsx`
- Modify: `app/dashboard/users/_components/table/columns.tsx`
- Modify: `app/dashboard/users/page.tsx`

**Interfaces:**
- Consumes: `useUpdateUserStatus` (Task 1), `UserStatus` type (Task 1), `useHasPermission` (existing).
- Produces: `UserStatusSelect({ id: number; status: UserStatus })`; `columns.tsx` changes its export from `columns: ColumnDef<UserListItem>[]` to `createColumns(canUpdateStatus: boolean): ColumnDef<UserListItem>[]`.

- [ ] **Step 1: Write `components/user-status-select.tsx`**

```tsx
"use client";

import { isAxiosError } from "axios";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateUserStatus } from "@/lib/user/management/mutations/useUpdateUserStatus";
import type { UserStatus } from "@/lib/user/management/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<UserStatus, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  active: { label: "ใช้งานอยู่", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  suspended: { label: "ระงับการใช้งาน", badge: "text-orange-600 bg-orange-400/15", dot: "bg-orange-600" },
  inactive: { label: "ปิดใช้งาน", badge: "text-gray-600 bg-gray-400/15", dot: "bg-gray-500" },
};

const VALID_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  pending: ["active"],
  active: ["suspended", "inactive"],
  suspended: ["active"],
  inactive: ["active"],
};

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function UserStatusSelect({ id, status }: { id: number; status: UserStatus }) {
  const updateStatus = useUpdateUserStatus(id);
  const options: UserStatus[] = [status, ...VALID_TRANSITIONS[status]];
  const style = STATUS_STYLE[status];

  const handleChange = (next: string) => {
    if (next === status || updateStatus.isPending) return;
    toast.promise(updateStatus.mutateAsync(next as UserStatus), {
      loading: "กำลังเปลี่ยนสถานะ...",
      success: "เปลี่ยนสถานะสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <Select
      items={options.map((value) => ({ value, label: STATUS_STYLE[value].label }))}
      value={status}
      onValueChange={handleChange}
    >
      <SelectTrigger size="sm" className={cn("rounded-full border-0 tracking-wider", style.badge)}>
        {updateStatus.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <span className={cn("w-1.75 h-1.75 rounded-full", style.dot)} />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="bottom" alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((value) => (
            <SelectItem key={value} value={value}>
              {STATUS_STYLE[value].label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Rewrite `app/dashboard/users/_components/table/columns.tsx`**

Current file:
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
                    {getInitials(row.original.name ?? "")}
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
        cell: ({ getValue }) => {
            const date = new Date(getValue<string>())
            return (
                <div className="text-center">
                    {Number.isNaN(date.getTime()) ? "-" : format(date, "dd-MM-yyyy")}
                </div>
            )
        },
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

Replace with:
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
import { UserStatusSelect } from "@/components/user-status-select"
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

export function createColumns(canUpdateStatus: boolean): ColumnDef<UserListItem>[] {
    return [
        {
            id: "name",
            header: "ผู้ใช้",
            enableSorting: false,
            accessorFn: (user) => user.name,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8.5 rounded-md bg-red-700 text-white text-xs font-bold tracking-wider">
                        {getInitials(row.original.name ?? "")}
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
            cell: ({ row }) => (
                <div className="flex justify-center">
                    {canUpdateStatus ? (
                        <UserStatusSelect id={row.original.id} status={row.original.status} />
                    ) : (
                        <UserStatusBadge status={row.original.status} />
                    )}
                </div>
            ),
        },
        {
            id: "created_at",
            header: ({ column }) => <SortableHeader column={column} label="วันที่สร้าง" align="center" />,
            accessorFn: (user) => user.createdAt,
            cell: ({ getValue }) => {
                const date = new Date(getValue<string>())
                return (
                    <div className="text-center">
                        {Number.isNaN(date.getTime()) ? "-" : format(date, "dd-MM-yyyy")}
                    </div>
                )
            },
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
}
```

- [ ] **Step 3: Wire into `app/dashboard/users/page.tsx` — imports**

Current (as left by Task 3):
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
import { useHasPermission } from "@/lib/auth/permissions";
import { useUserListPage, type UserStatusFilter, type UserTypeFilter } from "./_hooks/use-user-list-page";
import { UserListSkeleton, UserTableSkeleton } from "./_components/user-list-skeleton";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { columns } from "./_components/table/columns";
```

Replace with:
```tsx
"use client";

import { Suspense, useMemo } from "react";
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
import { useHasPermission } from "@/lib/auth/permissions";
import { useUserListPage, type UserStatusFilter, type UserTypeFilter } from "./_hooks/use-user-list-page";
import { UserListSkeleton, UserTableSkeleton } from "./_components/user-list-skeleton";
import { CreateUserDialog } from "./_components/create-user-dialog";
import { createColumns } from "./_components/table/columns";
```

- [ ] **Step 4: Wire into `app/dashboard/users/page.tsx` — compute columns**

Current (as left by Task 3, inside `UsersPageContent`):
```tsx
function UsersPageContent() {
  useBreadcrumb([{ label: "จัดการผู้ใช้" }]);

  const canCreateUser = useHasPermission("users.create");

  const {
    typeFilter,
```

Replace with:
```tsx
function UsersPageContent() {
  useBreadcrumb([{ label: "จัดการผู้ใช้" }]);

  const canCreateUser = useHasPermission("users.create");
  const canUpdateStatus = useHasPermission("users.updateStatus");
  const columns = useMemo(() => createColumns(canUpdateStatus), [canUpdateStatus]);

  const {
    typeFilter,
```

(`<DataTable columns={columns} ... />` further down the file already references the local `columns` identifier — no change needed there, since it now resolves to this `useMemo` result instead of the removed static import.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `components/user-status-select.tsx`, `app/dashboard/users/_components/table/columns.tsx`, or `app/dashboard/users/page.tsx`.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, navigate to `/dashboard/users`.

Verify:
1. With `users.updateStatus` permission (mock temporarily if needed, then revert): every row's status column renders a colored pill with a dropdown chevron instead of the plain badge.
2. Opening the dropdown on a `pending` user shows only "รอตรวจสอบ" (current) and "ใช้งานอยู่" — not "ระงับการใช้งาน" or "ปิดใช้งาน".
3. Opening the dropdown on an `active` user shows "ใช้งานอยู่" (current), "ระงับการใช้งาน", and "ปิดใช้งาน".
4. Opening the dropdown on a `suspended` or `inactive` user shows only that status (current) and "ใช้งานอยู่".
5. Selecting a different option shows a "กำลังเปลี่ยนสถานะ..." toast, a spinner replaces the dot in that row's trigger, then (backend 404 expected) an error toast — confirm via Network tab the request is `PATCH /api/v1/dashboard/users/{id}/status` with the correct body.
6. This behavior is identical across internal/company/individual rows (status change applies to every user type).
7. Without `users.updateStatus` permission, every row shows the plain read-only `UserStatusBadge` (no dropdown chevron, not clickable) — unchanged from before this task.
8. The User detail page's status badge remains read-only (no dropdown) regardless of permission — status is only editable from the table.
9. Light/dark mode both render legibly.

- [ ] **Step 8: Commit**

```bash
git add components/user-status-select.tsx "app/dashboard/users/_components/table/columns.tsx" app/dashboard/users/page.tsx
git commit -m "feat(user): add inline status-change dropdown to users table"
```

---

## Self-Review Notes

- **Spec coverage:** Spec API contract items 1–6 → Task 1 (`api.ts`/`types.ts`) covers the client side of endpoints 1–4 and the `role`/`internalProfile` additions from item 5; item 6 (backend permission seeding) is explicitly out of scope for this frontend-only plan per the spec's own "Backend implementation ... spec/plan แยกต่างหาก" line. Spec Part 1 (`lib/user/management/`) → Task 1. Spec Part 2 (create dialog) → Tasks 2 (schema/hook) + 3 (component/wiring). Spec Part 3 (edit dialog) → Tasks 2 (schema/hook) + 4 (component/wiring). Spec Part 4 (`UserStatusSelect` + `columns.tsx` factory) → Task 5. Spec's error-handling section (422 field errors via toast, status-select revert-via-invalidate) → covered in Task 2's `getErrorMessage` helpers and Task 5's `onSettled: invalidate` (a failed status mutation still invalidates, so the select re-renders from the server's actual — unchanged — status). Spec's permission-gating section → `canCreateUser`/`canUpdateUser`/`canUpdateStatus` in Tasks 3, 4, 5. Spec's testing section (no test runner, manual QA, light/dark) → each task's Step "Manual verification".
- **Placeholder scan:** No TBD/TODO in any step; every code block is complete. The one deliberately-disclosed limitation (mutations 404 until backend ships) is explicitly called out in Global Constraints and in each manual-verification step, not silently glossed over — this mirrors how the original list/detail plan shipped ahead of its backend.
- **Type consistency:** `CreateUserPayload`/`UpdateUserPayload` (Task 1 `types.ts`) field names match `CreateUserSchema`/`UpdateUserSchema` (Task 2) field-for-field, which match every `register("...")`/`errors.___?.message`/`Controller name="..."` call in Task 3's `CreateUserDialog` and Task 4's `EditUserDialog`. `useCreateUserForm(onSubmitted)` / `useUpdateUserForm(id, onSubmitted, initialValues)` signatures (Task 2) match their call sites in Tasks 3/4 exactly. `UserDetail.internalProfile`/`UserDetail.role` (Task 1) match the `EditUserDialog`'s `initialValues` construction (Task 4). `UserStatus` transitions in `VALID_TRANSITIONS` (Task 5) match the Global Constraints list, which matches the spec, which matches the real backend state machine already read from `UserStatus.php`. `createColumns(canUpdateStatus: boolean)` (Task 5 Step 2) matches its call site `createColumns(canUpdateStatus)` in Task 5 Step 4. `UserStatusSelect({ id, status })` (Task 5 Step 1) matches its usage `<UserStatusSelect id={row.original.id} status={row.original.status} />` in Task 5 Step 2.
