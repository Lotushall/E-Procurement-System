# Per-user Permission Overrides (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin customize an internal user's permissions beyond their role's defaults (add extras, deny role-granted ones) from the create/edit user pages, by extracting a reusable `PermissionPicker` component and wiring it into both pages with a role-change-resets-permissions behavior.

**Architecture:** Flatten-at-save — the frontend just collects a final `permissions: string[]` alongside `role` and sends it to the backend on create/update. No backend auth-check changes anywhere; the backend syncs this list as the user's direct Spatie permissions. This plan is frontend-only; the backend API contract is defined in `docs/superpowers/specs/2026-08-17-user-permission-overrides-design.md` and implemented separately.

**Tech Stack:** Next.js (App Router), TypeScript, react-hook-form + zod, `@tanstack/react-query`, Tailwind v4, shadcn/base-ui components.

## Global Constraints

- No test runner exists in this frontend repo (established repo convention). Verify every task with `npx tsc --noEmit` and `npm run lint`, then describe manual QA steps — do not write pytest/jest-style automated tests.
- No browser automation tool (chromium-cli/Playwright) is available in this dev environment (established repo convention, see project memory `project_no_browser_automation`). Manual browser QA must be disclosed as unperformed/pending to the user, not silently skipped or claimed as done.
- The backend endpoints do not yet accept/return the `permissions` field described here — this plan implements the frontend contract ahead of backend delivery (same precedent as `docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md`). Requests will 422/ignore the new field until the backend plan ships; this is expected and not a bug to chase down in this plan.
- Follow existing patterns exactly: `Controller` + `Select`/`InputField` wiring already established in `create/page.tsx` and `edit/page.tsx`; do not introduce a new form pattern.
- Branch `Internal`, working in place, no worktree, per this repo's established convention.
- Every commit must be scoped to only the files this plan intends to touch — check `git status --short` before staging, since a sibling backend/frontend session may have unrelated uncommitted work in the same working tree (established repo pattern, see project memory `project_parallel_sessions`).

---

### Task 1: Extract `PermissionPicker` shared component, rewire `RoleFormDialog`

**Files:**
- Create: `frontend/components/permission-picker.tsx`
- Modify: `frontend/app/dashboard/users/roles-permissions/_components/role-form-dialog.tsx`

**Interfaces:**
- Produces: `PermissionPicker({ permissions: Permission[], value: string[], onChange: (next: string[]) => void }): JSX.Element` — a named export, pure/controlled (no internal state, no data fetching). Consumed directly by Task 3 and Task 4.
- Consumes: `Permission` type from `@/lib/user/management/types` (already exists, unchanged), `getGroupLabel` from `@/app/dashboard/users/roles-permissions/_data/group-labels` (already exists, unchanged), `Checkbox` from `@/components/ui/checkbox` (already exists, unchanged).

This is a pure refactor: the exact JSX/logic currently inline inside `RoleFormDialog`'s permissions `Controller` moves into a new component, byte-for-byte, with zero behavior change. `RoleFormDialog` keeps ownership of the error-message paragraph (it's tied to `errors.permissions` from that specific form) and now just renders `<PermissionPicker>` for the grouped checkbox grid.

- [ ] **Step 1: Create `frontend/components/permission-picker.tsx`**

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { getGroupLabel } from "@/app/dashboard/users/roles-permissions/_data/group-labels";
import type { Permission } from "@/lib/user/management/types";

export function PermissionPicker({
  permissions,
  value,
  onChange,
}: {
  permissions: Permission[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const groups = permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
    const group = permission.name.split(".")[0];
    (acc[group] ??= []).push(permission);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold">{getGroupLabel(group)}</p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onChange(
                    Array.from(new Set([...value, ...items.map((permission) => permission.name)])),
                  )
                }
                className="cursor-pointer text-sm font-medium text-red-700 hover:underline"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    value.filter((name) => !items.some((permission) => permission.name === name)),
                  )
                }
                className="cursor-pointer text-sm text-muted-foreground hover:underline"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((permission) => (
              <label
                key={permission.name}
                htmlFor={permission.name}
                className="flex items-center gap-2.5 rounded-md border p-3 cursor-pointer hover:border-red-700/40"
              >
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
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-sm font-semibold">{permission.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{permission.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

Note: the original inline version had `mt-2` on the outer groups `<div>` (it sat below the error-message paragraph inside the same flex column). That spacing now comes from the caller's own `gap-4` flex column instead, so `mt-2` is intentionally dropped here — this is a deliberate, cosmetic side effect of the extraction, not an oversight.

- [ ] **Step 2: Rewire `role-form-dialog.tsx` to use it**

Replace the imports at the top of the file:

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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { InputField } from "@/app/(public)/profiles/_components/input-field";
import { PermissionPicker } from "@/components/permission-picker";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import type { RoleDetail } from "@/lib/user/management/types";
import { useRoleForm } from "../_hooks/use-role-form";
```

(`Checkbox` and `getGroupLabel` imports are removed — they moved into `PermissionPicker`. `Permission` is removed from the `types` import since it was only used for the now-deleted `groups` reduce's accumulator type. `DialogDescription` stays imported-but-unused exactly as it was before this task — that's a pre-existing, unrelated lint warning from a prior commit, not something this task should touch.)

Delete the `groups` computation block (it now lives inside `PermissionPicker`, recomputed from the `permissions` prop each render):

```tsx
  const groups = (permissions ?? []).reduce<Record<string, Permission[]>>((acc, permission) => {
    const group = permission.name.split(".")[0];
    (acc[group] ??= []).push(permission);
    return acc;
  }, {});
```

Replace the permissions `Controller`'s `render` body:

```tsx
            <Controller
              control={control}
              name="permissions"
              render={({ field: { value, onChange } }) => (
                <div className="flex flex-col gap-4">
                  {errors.permissions && (
                    <p className="text-xs text-destructive">{errors.permissions.message}</p>
                  )}
                  <PermissionPicker permissions={permissions ?? []} value={value} onChange={onChange} />
                </div>
              )}
            />
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` (from `frontend/`)
Expected: no errors.

Run: `npm run lint` (from `frontend/`)
Expected: same pre-existing baseline as before this task (legal-pages unescaped-entities errors, `data-table.tsx`/`role-tab.tsx` `react-hooks/incompatible-library` warnings, `role-form-dialog.tsx`'s pre-existing unused `DialogDescription` warning) — no new errors/warnings introduced by this task.

- [ ] **Step 4: Manual check (disclose as pending if no browser access)**

Open `/dashboard/users/roles-permissions`, open both "สร้าง role" and an existing role's edit dialog: confirm the permission grid, per-group Select All/Clear All, and checkbox toggling all look and behave exactly as before this task (this is a pure refactor — any visible difference is a regression). No browser tooling is available in this dev environment; disclose this check as not actually performed unless you have real browser access.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/permission-picker.tsx frontend/app/dashboard/users/roles-permissions/_components/role-form-dialog.tsx
git commit -m "refactor(permissions): extract PermissionPicker as a shared component"
```

---

### Task 2: Extend the `permissions` field through types and schemas

**Files:**
- Modify: `frontend/lib/user/management/types.ts`
- Modify: `frontend/app/dashboard/users/_schemas/schema.ts`
- Modify: `frontend/app/dashboard/users/_hooks/use-create-user-form.ts`

**Interfaces:**
- Consumes: none new.
- Produces: `UserDetail.permissions: string[] | null`, `CreateUserPayload.permissions: string[]`, `UpdateInternalUserPayload.permissions: string[]`, `CreateUserSchema`/`CreateUserValues` gains `permissions: string[]`, `UpdateInternalUserSchema`/`UpdateInternalUserValues` gains `permissions: string[]`. `UpdateAccountSchema`/`UpdateAccountPayload` (external/company/individual users) are deliberately **not** touched — they have no role/permission concept. Consumed by Task 3 and Task 4.

- [ ] **Step 1: Add `permissions` to `UserDetail`, `CreateUserPayload`, `UpdateInternalUserPayload` in `types.ts`**

```ts
export interface UserDetail extends UserListItem {
  vendorProfileId: number | null;
  role: string | null;
  internalProfile: InternalProfileFields | null;
  permissions: string[] | null;
}
```

```ts
export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  permissions: string[];
  prefix?: string;
  firstname: string;
  lastname: string;
  employeeNo?: string;
  department?: string;
  position?: string;
  phone?: string;
}
```

```ts
export interface UpdateInternalUserPayload extends UpdateAccountPayload {
  role: string;
  permissions: string[];
  prefix?: string;
  firstname: string;
  lastname: string;
  employeeNo?: string;
  department?: string;
  position?: string;
  phone?: string;
}
```

- [ ] **Step 2: Add `permissions` to `CreateUserSchema` and `UpdateInternalUserSchema` in `schema.ts`**

```ts
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
  permissions: z.array(z.string()),
});
```

```ts
export const UpdateInternalUserSchema = z.object({
  username: z.string().min(1, "กรุณากรอก username"),
  email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
  password: OptionalPasswordSchema,
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  employeeNo: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "กรุณาเลือก role"),
  permissions: z.array(z.string()),
});
```

(`UpdateAccountSchema` above these two stays exactly as-is — no `permissions` field.)

- [ ] **Step 3: Add `permissions: []` to `useCreateUserForm`'s `defaultValues`**

In `use-create-user-form.ts`:

```ts
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
      permissions: [],
    },
  });
```

No other change needed in this file — `onSubmit` already spreads the full `values` object (which now includes `permissions`) straight into `createUserMutation.mutateAsync(values)`, and `CreateUserPayload` (Task 2 Step 1) now accepts it.

`use-update-internal-user-form.ts` needs **no changes at all**: it already takes `initialValues: UpdateInternalUserValues` from its caller and spreads `values` straight into `updateUserMutation.mutateAsync({ ...values, password: ... })` — once `UpdateInternalUserValues` includes `permissions` (via Step 2) and the caller (Task 4) passes it in `initialValues`, it flows through automatically.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: **one new error** in `frontend/app/dashboard/users/edit/page.tsx` — `EditInternalUserForm` builds an `initialValues` object literal passed straight to `useUpdateInternalUserForm(id, onSubmitted, initialValues: UpdateInternalUserValues)`, and that literal doesn't include the now-required `permissions` field, so TypeScript's excess/missing-property check on the literal fails there: `Property 'permissions' is missing in type '{ username: ...; }' but required in type 'UpdateInternalUserValues'`. This is expected — Task 4 fixes it. `create/page.tsx` should show **no** new error: it never builds a `CreateUserValues` object literal itself (only `use-create-user-form.ts`'s `defaultValues` does, and Step 3 above already fixed that in this same task), so nothing there is missing the field yet. Confirm the tsc output matches this — exactly one new error, in `edit/page.tsx` only — before moving on.

Run: `npm run lint`
Expected: same pre-existing baseline, no new warnings from the files touched in this task (types.ts/schema.ts/use-create-user-form.ts have no JSX, lint should be silent on them).

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/user/management/types.ts frontend/app/dashboard/users/_schemas/schema.ts frontend/app/dashboard/users/_hooks/use-create-user-form.ts
git commit -m "feat(users): add permissions field to user create/update contract"
```

---

### Task 3: Wire the permission picker into the create-user page

**Files:**
- Modify: `frontend/app/dashboard/users/create/page.tsx`

**Interfaces:**
- Consumes: `PermissionPicker` (Task 1), `permissions: string[]` on `CreateUserValues`/`CreateUserSchema` (Task 2), existing `usePermissions()` (`@/lib/user/management/queries/usePermissions`, returns `{ data: Permission[] | undefined }`), existing `RoleDetail.permissions: string[]` from `useRoles()`.

This task fixes the `useForm` type error Task 2 introduced in this file by actually rendering the new field, and wires the "pick a role → checklist resets to that role's defaults" behavior.

- [ ] **Step 1: Add the `usePermissions` import and call, destructure `setValue`**

In `create/page.tsx`, add to the import block:

```tsx
import { PermissionPicker } from "@/components/permission-picker";
```
```tsx
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
```

Change the top of `CreateUserPageContent`:

```tsx
function CreateUserPageContent() {
  const router = useRouter();
  const { data: roles } = useRoles();
  const { data: permissions } = usePermissions();
  const { register, control, setValue, onSubmit, isSubmitting, formState: { errors } } =
    useCreateUserForm(() => router.push(routes.dashboards.user.index));
```

- [ ] **Step 2: Reset `permissions` when `role` changes**

Replace the `role` field's `Controller`:

```tsx
            <Controller
              control={control}
              name="role"
              render={({ field: { value, onChange, ...field } }) => (
                <InputField label="บทบาท (Role)" error={errors.role?.message}>
                  <Select
                    items={(roles ?? []).map((r) => ({ value: r.name, label: ROLE_LABELS[r.name] ?? r.name }))}
                    value={value}
                    onValueChange={(next) => {
                      onChange(next);
                      setValue("permissions", (roles ?? []).find((r) => r.name === next)?.permissions ?? []);
                    }}
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
```

(Only the `onValueChange` prop changed — everything else in this block is identical to before.)

- [ ] **Step 3: Render the picker**

Add a new `Controller` immediately after the `role` one (and before the closing `<div className="flex justify-end gap-2 pt-2">` footer):

```tsx
            <Controller
              control={control}
              name="permissions"
              render={({ field: { value, onChange } }) => (
                <div className="flex flex-col gap-4">
                  {errors.permissions && (
                    <p className="text-xs text-destructive">{errors.permissions.message}</p>
                  )}
                  <PermissionPicker permissions={permissions ?? []} value={value} onChange={onChange} />
                </div>
              )}
            />
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (Task 2 did not leave an error in this file — see Task 2 Step 4 — so this just confirms the new code compiles cleanly).

Run: `npm run lint`
Expected: same pre-existing baseline, no new errors/warnings.

- [ ] **Step 5: Manual check (disclose as pending if no browser access)**

On `/dashboard/users/create`: confirm no permission is checked before a role is picked; pick a role and confirm the checklist auto-checks exactly that role's permissions; check/uncheck a few boxes and confirm they stick (don't get wiped) while other fields are edited; switch to a different role and confirm the checklist resets to the new role's defaults, discarding prior manual changes. No browser tooling is available in this dev environment; disclose this check as not actually performed unless you have real browser access.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/dashboard/users/create/page.tsx
git commit -m "feat(users): add permission picker to the create-user page"
```

---

### Task 4: Wire the permission picker into the edit-user page

**Files:**
- Modify: `frontend/app/dashboard/users/edit/page.tsx`

**Interfaces:**
- Consumes: `PermissionPicker` (Task 1), `permissions: string[]` on `UpdateInternalUserValues`/`UpdateInternalUserSchema` (Task 2), `UserDetail.permissions: string[] | null` (Task 2), existing `usePermissions()`, existing `RoleDetail.permissions`.

Same wiring as Task 3, applied to `EditInternalUserForm` only — `EditAccountForm` (used for company/individual users) is untouched, since it has no role/permission concept.

- [ ] **Step 1: Add the `usePermissions` import**

```tsx
import { PermissionPicker } from "@/components/permission-picker";
```
```tsx
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
```

- [ ] **Step 2: Wire `EditInternalUserForm`'s state and initial value**

Replace the top of `EditInternalUserForm`:

```tsx
function EditInternalUserForm({ user }: { user: UserDetail }) {
  const router = useRouter();
  const { data: roles } = useRoles();
  const { data: permissions } = usePermissions();
  const { register, control, setValue, onSubmit, isSubmitting, formState: { errors } } =
    useUpdateInternalUserForm(user.id, () => router.push(routes.dashboards.user.detail(user.id)), {
      username: user.username,
      email: user.email,
      password: "",
      prefix: user.internalProfile?.prefix ?? "นาย",
      firstname: user.internalProfile?.firstname ?? "",
      lastname: user.internalProfile?.lastname ?? "",
      employeeNo: user.internalProfile?.employeeNo ?? "",
      department: user.internalProfile?.department ?? "",
      position: user.internalProfile?.position ?? "",
      phone: user.internalProfile?.phone ?? "",
      role: user.role ?? "",
      permissions: user.permissions ?? [],
    });
```

- [ ] **Step 3: Reset `permissions` when `role` changes**

Replace the `role` field's `Controller` inside `EditInternalUserForm` (same change as Task 3 Step 2, applied here):

```tsx
      <Controller
        control={control}
        name="role"
        render={({ field: { value, onChange, ...field } }) => (
          <InputField label="บทบาท (Role)" error={errors.role?.message}>
            <Select
              items={(roles ?? []).map((r) => ({ value: r.name, label: ROLE_LABELS[r.name] ?? r.name }))}
              value={value}
              onValueChange={(next) => {
                onChange(next);
                setValue("permissions", (roles ?? []).find((r) => r.name === next)?.permissions ?? []);
              }}
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
```

- [ ] **Step 4: Render the picker**

Add immediately after the `role` `Controller` (before the footer `<div className="flex justify-end gap-2 pt-2">`), inside `EditInternalUserForm`:

```tsx
      <Controller
        control={control}
        name="permissions"
        render={({ field: { value, onChange } }) => (
          <div className="flex flex-col gap-4">
            {errors.permissions && (
              <p className="text-xs text-destructive">{errors.permissions.message}</p>
            )}
            <PermissionPicker permissions={permissions ?? []} value={value} onChange={onChange} />
          </div>
        )}
      />
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors anywhere (this was the last remaining "Property 'permissions' is missing" call site from Task 2).

Run: `npm run lint`
Expected: same pre-existing baseline, no new errors/warnings.

- [ ] **Step 6: Manual check (disclose as pending if no browser access)**

Open `/dashboard/users/edit?id=<an internal user's id>`: confirm the checklist pre-populates from that user's current `permissions` (not necessarily identical to their role's defaults, if they were customized before — since the backend hasn't shipped this field yet, `user.permissions` will currently be `undefined`/`null` from the real API, so this falls back to `[]`; verify that fallback doesn't crash the page). Change the role dropdown and confirm the checklist resets to the new role's defaults. Confirm `/dashboard/users/edit?id=<a company/individual user's id>` shows no permission picker at all (goes through `EditAccountForm`, untouched by this task). No browser tooling is available in this dev environment; disclose this check as not actually performed unless you have real browser access.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/dashboard/users/edit/page.tsx
git commit -m "feat(users): add permission picker to the edit-user page"
```

---

## Testing carried from the spec (manual QA, post-backend)

The spec's full testing checklist (`docs/superpowers/specs/2026-08-17-user-permission-overrides-design.md`, "Testing" section) requires a live backend implementing the `permissions` field to actually exercise end-to-end (create → customize → save → reopen → confirm persisted; role-switch reset; effective-permission enforcement). None of that is executable from this frontend-only plan — items 1, 4, 5, and 7 above are the frontend-only subset that can be manually verified against the current (frontend-only) state. Once the sibling backend session ships the matching endpoints, re-run the spec's full 8-item checklist against the real API before considering this feature complete end-to-end.
