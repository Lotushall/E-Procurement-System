# Internal User Select-Existing-Profile (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the "create internal user" form to select an existing, not-yet-linked Internal Profile (`internalProfileId`) instead of typing employee data (prefix/firstname/lastname/employeeNo/department/position/phone) directly.

**Architecture:** Add a new read-only data layer (`AvailableInternalProfile` type + `fetchAvailableInternalProfiles` + `useAvailableInternalProfiles`) mirroring the existing `useDepartmentOptions` pattern, add a new required search-combobox component (`InternalProfileSelect`) mirroring `DepartmentSelect`, then swap the 7 profile fields for the single `internalProfileId` field across the create-user form's schema/payload type/hook/fields component/page in one atomic change.

**Tech Stack:** Next.js (App Router), react-hook-form + zod (`@hookform/resolvers/zod`), TanStack Query, axios, base-ui Combobox (`components/ui/combobox.tsx`), sonner (toast).

## Global Constraints

- This is a non-standard Next.js version — before writing any code, skim the relevant guide under `node_modules/next/dist/docs/` for any convention this plan's files touch (routing/forms), per `frontend/AGENTS.md`.
- No automated test framework exists in this frontend (`package.json` has no test script, no `.test.`/`.spec.` files anywhere in the repo). Do NOT add Jest/Vitest or invent a test runner. Every task's verification step is `npx tsc --noEmit` + `npm run lint`, run from `frontend/`.
- The backend endpoint this depends on (`GET /api/v1/dashboard/internal-profiles/select-available`) and the `internalProfileId` field on `POST /api/v1/dashboard/users` are being implemented in a **separate, parallel session** and do not exist yet. This is expected and matches the existing convention in `lib/user/management/api.ts` (a file-header comment marking "designed-but-not-yet-implemented backend contract") — follow that same convention, do not block on the backend being ready.
- Manual browser QA is not available in this environment. Every task's deliverable is verified by `tsc`/`lint` only; say so explicitly rather than claiming the UI was clicked through.
- Thai UI copy only for user-facing strings (matches every existing string in the touched files).
- Never commit without the user's explicit go-ahead in this session (standing project preference) — stage or leave changes unstaged; do not run `git commit` as part of any step below unless the user says so at execution time.

---

### Task 1: Available-internal-profiles data layer

**Files:**
- Modify: `frontend/lib/internal-profiles/types.ts`
- Modify: `frontend/lib/internal-profiles/api.ts`
- Create: `frontend/lib/internal-profiles/queries/useAvailableInternalProfiles.ts`

**Interfaces:**
- Consumes: nothing new (uses existing `api` client from `frontend/lib/api.ts`, same as every other function in `internal-profiles/api.ts`)
- Produces: `AvailableInternalProfile { id: number; name: string }` (exported type), `fetchAvailableInternalProfiles(): Promise<AvailableInternalProfile[]>`, `useAvailableInternalProfiles()` (TanStack Query hook returning `{ data: AvailableInternalProfile[] | undefined, ... }`) — Task 2 and Task 3 both import these.

- [ ] **Step 1: Add the `AvailableInternalProfile` type**

Open `frontend/lib/internal-profiles/types.ts`. Add this after the `Position` interface (after line 33, right before `export interface PaginatedUserList`):

```typescript
export interface AvailableInternalProfile {
  id: number;
  name: string;
}
```

- [ ] **Step 2: Add `fetchAvailableInternalProfiles` to the API module**

Open `frontend/lib/internal-profiles/api.ts`. Add `AvailableInternalProfile` to the type-only import block at the top (alphabetical, matches existing style):

```typescript
import { api } from "../api";
import {
  AvailableInternalProfile,
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

Then add this function right after `fetchPositionOptions` (after the closing brace that currently ends at line 73, before `export async function fetchDepartmentList`):

```typescript
export async function fetchAvailableInternalProfiles(): Promise<AvailableInternalProfile[]> {
  const { data } = await api.get("/api/v1/dashboard/internal-profiles/select-available");
  return data.data;
}
```

- [ ] **Step 3: Add the query hook**

Create `frontend/lib/internal-profiles/queries/useAvailableInternalProfiles.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { fetchAvailableInternalProfiles } from "../api";

export function useAvailableInternalProfiles() {
  return useQuery({
    queryKey: ["internal-profiles", "select-available"],
    queryFn: fetchAvailableInternalProfiles,
  });
}
```

This mirrors `frontend/lib/internal-profiles/queries/useDepartmentOptions.ts` exactly — no custom `staleTime`/`gcTime` (the "not cached" note in the backend spec is about backend-side caching, not React Query).

- [ ] **Step 4: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors introduced by these 3 files (the pre-existing unrelated `register/page.tsx` error, if still present, is not from this task).

Run: `cd frontend && npm run lint`
Expected: no lint errors in the 3 files touched.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/internal-profiles/types.ts frontend/lib/internal-profiles/api.ts frontend/lib/internal-profiles/queries/useAvailableInternalProfiles.ts
git commit -m "feat: add available-internal-profiles query for user creation picker"
```

---

### Task 2: `InternalProfileSelect` component

**Files:**
- Create: `frontend/components/internal-profile-select.tsx`

**Interfaces:**
- Consumes: `AvailableInternalProfile` from `@/lib/internal-profiles/types` (Task 1)
- Produces: `InternalProfileSelect` component with props `{ profiles: AvailableInternalProfile[]; value: string; onValueChange: (next: string) => void; ariaInvalid?: boolean; className?: string }` — Task 3's `create-internal-user-fields.tsx` renders this.

- [ ] **Step 1: Create the component**

Create `frontend/components/internal-profile-select.tsx`, adapted from `frontend/components/department-select.tsx` (read that file first to match its exact Combobox wiring) but **required** — no `EMPTY_OPTION`/`allOption`, since `internalProfileId` is a required field (same posture as `RoleSelect`, not the optional `DepartmentSelect`):

```typescript
"use client";

import { ChevronDown } from "lucide-react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import type { AvailableInternalProfile } from "@/lib/internal-profiles/types";
import { cn } from "@/lib/utils";

export function InternalProfileSelect({
  profiles,
  value,
  onValueChange,
  ariaInvalid,
  className,
}: {
  profiles: AvailableInternalProfile[];
  value: string;
  onValueChange: (next: string) => void;
  ariaInvalid?: boolean;
  className?: string;
}) {
  const idByLabel = new Map(profiles.map((p) => [p.name, String(p.id)]));
  const labelById = new Map(profiles.map((p) => [String(p.id), p.name]));

  const items = profiles.map((p) => p.name);

  return (
    <Combobox
      items={items}
      value={labelById.get(value) ?? null}
      onValueChange={(next) => {
        if (next === null) return;
        const id = idByLabel.get(next);
        if (id !== undefined) onValueChange(id);
      }}
    >
      <ComboboxTrigger
        render={
          <Button
            variant="outline"
            aria-invalid={ariaInvalid}
            className={cn(
              "w-full justify-between font-normal text-black bg-white hover:bg-white data-popup-open:bg-white data-placeholder:text-gray-400",
              "focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none",
              className,
            )}
          >
            <span className="min-w-0 truncate">
              <ComboboxValue placeholder="เลือกพนักงาน" />
            </span>
            <ChevronDown />
          </Button>
        }
        className="h-10 rounded-sm"
      />
      <ComboboxContent>
        <ComboboxInput
          showTrigger={false}
          placeholder="ค้นหาพนักงาน"
          className="
          bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
          has-[[data-slot=input-group-control]:focus-visible]:border-transparent
          has-[[data-slot=input-group-control]:focus-visible]:ring-0
          "
        />
        <ComboboxEmpty>ไม่พบพนักงานที่ว่าง</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
```

Note the two Thai empty-state strings differ from `DepartmentSelect` on purpose: the trigger placeholder is "เลือกพนักงาน" (pick an employee) and `ComboboxEmpty` reads "ไม่พบพนักงานที่ว่าง" (no available employee found) — this covers both "nothing matched the search" and "there are zero available profiles at all" (an empty `profiles` array renders zero items, so this same empty state shows).

- [ ] **Step 2: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors (this file isn't imported anywhere yet, so it only needs to type-check standalone).

Run: `cd frontend && npm run lint`
Expected: no lint errors in this file.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/internal-profile-select.tsx
git commit -m "feat: add InternalProfileSelect combobox component"
```

---

### Task 3: Wire `internalProfileId` into the create-user form

**Files:**
- Modify: `frontend/lib/user/management/types.ts`
- Modify: `frontend/lib/user/management/api.ts`
- Modify: `frontend/app/dashboard/users/_schemas/schema.ts`
- Modify: `frontend/app/dashboard/users/_hooks/use-create-user-form.ts`
- Modify: `frontend/app/dashboard/users/_components/create-internal-user-fields.tsx`
- Modify: `frontend/app/dashboard/users/create/page.tsx`

**Interfaces:**
- Consumes: `AvailableInternalProfile` (Task 1 type), `useAvailableInternalProfiles` (Task 1 hook), `InternalProfileSelect` (Task 2 component)
- Produces: `CreateUserPayload` with `internalProfileId: number` (no more `prefix`/`firstname`/`lastname`/`employeeNo`/`departmentId`/`positionId`/`phone`), `CreateUserSchema`/`CreateUserValues` with `internalProfileId: string`

This task must land as one change: `CreateUserSchema` (values shape), `use-create-user-form.ts` (reads those values), and `create-internal-user-fields.tsx` (registers those field names) all reference the same field set, so changing one without the others breaks `tsc`.

- [ ] **Step 1: Update `CreateUserPayload`**

In `frontend/lib/user/management/types.ts`, replace the `CreateUserPayload` interface (currently lines 66-79):

```typescript
export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  permissions: string[];
  internalProfileId: number;
}
```

(`UpdateAccountPayload`/`UpdateInternalUserPayload`/`UpdateUserPayload` below it are untouched — the edit form already has no profile fields.)

- [ ] **Step 2: Update `CreateUserSchema`**

In `frontend/app/dashboard/users/_schemas/schema.ts`, replace the `CreateUserSchema` block (currently lines 3-16):

```typescript
export const CreateUserSchema = z.object({
  username: z.string().min(1, "กรุณากรอก username"),
  email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  internalProfileId: z.string().min(1, "กรุณาเลือกพนักงาน"),
  role: z.string().min(1, "กรุณาเลือก role"),
  permissions: z.array(z.string()),
});

export type CreateUserValues = z.infer<typeof CreateUserSchema>;
```

Leave `OptionalPasswordSchema`, `UpdateAccountSchema`, and `UpdateInternalUserSchema` below it exactly as they are.

- [ ] **Step 3: Update the create-user form hook**

In `frontend/app/dashboard/users/_hooks/use-create-user-form.ts`, replace the `defaultValues` object and the `onSubmit` payload construction:

```typescript
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      internalProfileId: "",
      role: "",
      permissions: [],
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreateUserPayload = {
      username: values.username,
      email: values.email,
      password: values.password,
      role: values.role,
      permissions: values.permissions,
      internalProfileId: Number(values.internalProfileId),
    };
```

`getErrorMessage` and the rest of the file (the `toast.promise` call, the returned object) are unchanged — it already reads `error.response.data.errors` generically, so a validation error on `internalProfileId` from the backend surfaces automatically.

- [ ] **Step 4: Update the fields component**

Replace the full contents of `frontend/app/dashboard/users/_components/create-internal-user-fields.tsx`:

```typescript
"use client";

import type { Control, FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import { PermissionPicker } from "@/components/permission-picker";
import { RoleSelect } from "@/components/role-select";
import { InternalProfileSelect } from "@/components/internal-profile-select";
import type { Permission, RoleDetail } from "@/lib/user/management/types";
import type { AvailableInternalProfile } from "@/lib/internal-profiles/types";
import type { CreateUserValues } from "../_schemas/schema";

export function CreateInternalUserFields({
  register,
  control,
  errors,
  setValue,
  roles,
  permissions,
  internalProfiles,
}: {
  register: UseFormRegister<CreateUserValues>;
  control: Control<CreateUserValues>;
  errors: FieldErrors<CreateUserValues>;
  setValue: UseFormSetValue<CreateUserValues>;
  roles: RoleDetail[];
  permissions: Permission[];
  internalProfiles: AvailableInternalProfile[];
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
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

      <Controller
        control={control}
        name="internalProfileId"
        render={({ field: { value, onChange } }) => (
          <InputField label="พนักงาน" error={errors.internalProfileId?.message}>
            <InternalProfileSelect
              profiles={internalProfiles}
              value={value}
              ariaInvalid={!!errors.internalProfileId}
              onValueChange={onChange}
              className="h-11!"
            />
          </InputField>
        )}
      />

      <Controller
        control={control}
        name="role"
        render={({ field: { value, onChange } }) => (
          <InputField label="บทบาท (Role)" error={errors.role?.message}>
            <RoleSelect
              roles={roles}
              value={value}
              ariaInvalid={!!errors.role}
              onValueChange={(next) => {
                onChange(next);
                setValue("permissions", roles.find((r) => r.name === next)?.permissions ?? []);
              }}
            />
          </InputField>
        )}
      />

      <Controller
        control={control}
        name="permissions"
        render={({ field: { value, onChange } }) => (
          <div className="flex flex-col gap-4">
            {errors.permissions && (
              <p className="text-xs text-destructive">{errors.permissions.message}</p>
            )}
            <PermissionPicker permissions={permissions} value={value} onChange={onChange} />
          </div>
        )}
      />
    </>
  );
}
```

- [ ] **Step 5: Update the create page**

In `frontend/app/dashboard/users/create/page.tsx`:

Replace the two option-query imports:

```typescript
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { usePositionOptions } from "@/lib/internal-profiles/queries/usePositionOptions";
```

with:

```typescript
import { useAvailableInternalProfiles } from "@/lib/internal-profiles/queries/useAvailableInternalProfiles";
```

Replace this line inside `CreateUserPageContent`:

```typescript
  const { data: departments } = useDepartmentOptions();
  const { data: positions } = usePositionOptions();
```

with:

```typescript
  const { data: internalProfiles } = useAvailableInternalProfiles();
```

And replace the `departments`/`positions` props passed to `CreateInternalUserFields`:

```typescript
                departments={departments ?? []}
                positions={positions ?? []}
```

with:

```typescript
                internalProfiles={internalProfiles ?? []}
```

- [ ] **Step 6: Extend the `lib/user/management/api.ts` header comment**

At the top of `frontend/lib/user/management/api.ts`, the comment currently reads:

```typescript
// These endpoints are a designed-but-not-yet-implemented backend contract.
// See docs/superpowers/specs/2026-08-13-user-management-list-design.md (list/detail)
// and docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md (create/edit/status/roles).
// Requests will fail until the backend API plan(s) ship.
```

Add one more line after the second `See`/`and` line, before "Requests will fail...":

```typescript
// and docs/superpowers/specs/2026-08-27-internal-user-select-existing-profile-design.md
// (create: internalProfileId replaces direct profile fields; backend + this frontend
// counterpart in docs/superpowers/specs/2026-08-27-internal-user-select-existing-profile-frontend-design.md).
```

- [ ] **Step 7: Verify**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from any of the 6 files touched in this task (any pre-existing unrelated error elsewhere in the repo is not in scope for this plan).

Run: `cd frontend && npm run lint`
Expected: no lint errors in the 6 files touched, and no unused-import warnings (confirm `Department`/`Position`/`DepartmentSelect`/`PositionSelect`/`useDepartmentOptions`/`usePositionOptions` are fully gone from every file that no longer needs them).

Manual QA (disclose, don't simulate): browser automation isn't available in this environment. Tell the user to open `/dashboard/users/create` themselves and confirm: the "พนักงาน" combobox lists/searches available profiles, submitting without picking one shows "กรุณาเลือกพนักงาน", and once the backend endpoint exists, a successful submit creates the user linked to the chosen profile.

- [ ] **Step 8: Commit**

```bash
git add frontend/lib/user/management/types.ts frontend/lib/user/management/api.ts frontend/app/dashboard/users/_schemas/schema.ts frontend/app/dashboard/users/_hooks/use-create-user-form.ts frontend/app/dashboard/users/_components/create-internal-user-fields.tsx frontend/app/dashboard/users/create/page.tsx
git commit -m "feat: select existing internal profile instead of typing employee data on user creation"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers spec section 1 (types & API), Task 2 covers section 2 (component), Task 3 covers sections 3-7 (schema/payload, hook, fields component, page, api.ts comment) plus the empty-state behavior (section "Empty state" — handled implicitly by `ComboboxEmpty` + required-field validation, no extra code needed). "Out of scope" items (backend, edit form, bulk/relink) are correctly untouched by any task.
- **Type consistency:** `AvailableInternalProfile { id, name }` (Task 1) is the exact shape `InternalProfileSelect` (Task 2) and `create/page.tsx` (Task 3) consume. `internalProfileId` is `string` in `CreateUserValues`/form state and `number` in `CreateUserPayload`, matching the existing `departmentId`/`positionId` string→number pattern this codebase already uses elsewhere.
- **No placeholders:** every step above has complete, copy-pasteable code — nothing deferred to "add validation" or "similar to Task N".
