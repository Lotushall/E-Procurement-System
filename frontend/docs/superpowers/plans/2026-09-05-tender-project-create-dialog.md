# Tender Project Create Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead "สร้างโครงการใหม่" link on `/dashboard/tender-projects` (it points at a route that doesn't exist — a live `tsc` error) with a working popup dialog that creates a tender project via the already-shipped `POST /api/v1/dashboard/tender-projects` backend endpoint.

**Architecture:** A self-contained `CreateTenderProjectDialog` component (trigger button + `Dialog` + form, same shape as `edit-department-dialog.tsx`/`internal-profile-form-dialog.tsx`) backed by a zod schema, a `react-hook-form` hook, and a `useMutation` that POSTs and invalidates the list query on settle. Two new reusable combobox components support two of the nine form fields.

**Tech Stack:** Next.js (custom fork — see `AGENTS.md`), React Query (`@tanstack/react-query`), `react-hook-form` + `@hookform/resolvers/zod` + `zod`, Base UI (`@base-ui/react`) primitives wrapped in `components/ui/*`, `sonner` for toasts, `date-fns`.

## Global Constraints

- This repo runs a customized Next.js — before touching anything App-Router-specific that isn't already an established pattern in this codebase, check `node_modules/next/dist/docs/` (per `AGENTS.md`). Every file in this plan copies an existing, already-working pattern from this codebase, so no new Next.js API surface is introduced.
- No automated frontend test suite exists (no jest/vitest config, no `*.test.tsx` files anywhere in the repo). Verification for every task is `npx tsc --noEmit -p tsconfig.json` + `npx eslint <changed files>`, with manual QA in the dev server for the final wiring task.
- API field names are camelCase, matching the backend `Data` class property names exactly (`config/data.php`'s `name_mapping_strategy` is `null` — no snake_case↔camelCase conversion happens anywhere in the stack). Never snake_case a field going to/from `/api/v1/dashboard/tender-projects`.
- **Do not run `git commit` for any step in this plan unless the user explicitly approves it first.** This project's standing instruction is that commits require explicit per-instance approval — it overrides the usual "commit after every task" default. Finish a task, run its verification, and stop there; report readiness to commit and wait.
- Toast copy pattern (loading/success/error) and the `getErrorMessage(error)` helper shape are copy-pasted per-file in this codebase (not a shared utility) — every new file that needs one defines its own local copy, matching `use-department-form.ts` / `delete-user-dialog.tsx`.

---

## Task 1: Data layer — payload type, API call, mutation

**Files:**
- Modify: `lib/tender/tender-projects/types.ts`
- Modify: `lib/tender/tender-projects/api.ts`
- Create: `lib/tender/tender-projects/mutations/useCreateTenderProject.ts`

**Interfaces:**
- Produces: `CreateTenderProjectPayload` (type), `createTenderProject(payload: CreateTenderProjectPayload): Promise<{ projectCode: string }>` (function), `useCreateTenderProject()` (hook returning a `useMutation` result whose `mutateAsync` takes `CreateTenderProjectPayload` and resolves to `{ projectCode: string }`).

- [ ] **Step 1: Add `CreateTenderProjectPayload` to `lib/tender/tender-projects/types.ts`**

Append to the end of the file:

```ts
export interface CreateTenderProjectPayload {
  name: string;
  description?: string;
  budget: number;
  departmentId: number;
  personInChargeId?: number;
  procurementMethod: string;
  fiscalYear: number;
  projectStartAt?: string;
  projectEndAt?: string;
}
```

- [ ] **Step 2: Replace the empty `createTenderProjects()` stub in `lib/tender/tender-projects/api.ts`**

The file currently ends with:

```ts
export async function createTenderProjects() {
  // Implementation for creating a new tender project
}
```

Replace that whole function with:

```ts
export async function createTenderProject(
  payload: CreateTenderProjectPayload,
): Promise<{ projectCode: string }> {
  const { data } = await api.post<{ data: { projectCode: string } }>(
    "/api/v1/dashboard/tender-projects",
    payload,
  );
  return data.data;
}
```

Add `CreateTenderProjectPayload` to the existing `import { ... } from "./types";` at the top of the file (it currently imports `PaginatedTenderProjectsList`, `TenderProjectSortBy`, `TenderProjectSortDirection`).

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning `lib/tender/tender-projects/api.ts` or `types.ts`. (The pre-existing unrelated errors in `app/(auth)/register/page.tsx` and `app/dashboard/internal-employees/departments-positions/page.tsx` are not from this change — ignore them.)

- [ ] **Step 4: Create the mutation hook**

Create `lib/tender/tender-projects/mutations/useCreateTenderProject.ts`:

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

`["tenders_projects"]` matches the query key prefix already used by `useTenderProjectsList` in `lib/tender/tender-projects/queries/useTendersProjectList.ts` — invalidating it refreshes both the table and the stats cards (both come from that one query's data).

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning the new mutation file.

Run: `npx eslint lib/tender/tender-projects/types.ts lib/tender/tender-projects/api.ts lib/tender/tender-projects/mutations/useCreateTenderProject.ts`
Expected: no output (clean).

---

## Task 2: `InternalProfileCombobox` — global debounced search combobox

**Files:**
- Create: `components/internal-profile-combobox.tsx`

**Interfaces:**
- Consumes: `useInternalProfileList(page, perPage, search?, sortBy?, sortDirection?, departmentId?, positionId?)` from `lib/internal-profiles/queries/useInternalProfileList.ts` (existing, unchanged) — called as `useInternalProfileList(1, 20, debouncedQuery || undefined)`. `InternalProfile` type from `lib/internal-profiles/types.ts` (existing: `{ id, userId, employeeNo, prefix, firstname, lastname, department, position, phone }`).
- Produces: `InternalProfileCombobox({ value, onValueChange, ariaInvalid?, className? })` — `value` is the selected profile's `id` as a string (`""` = none selected), `onValueChange(next: string)` fires with the new id (or `""` when cleared).

This is a **new, distinct** component from the existing `components/internal-profile-select.tsx` — that one wraps `useAvailableInternalProfiles()` (`GET /internal-profiles/select-available`, filtered server-side to `whereNull('user_id')`, i.e. profiles with no login yet, built for the "create user" flow). Picking a project's person-in-charge needs *any* internal profile, so it must not reuse that hook.

- [ ] **Step 1: Create the component**

Create `components/internal-profile-combobox.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { useInternalProfileList } from "@/lib/internal-profiles/queries/useInternalProfileList";
import type { InternalProfile } from "@/lib/internal-profiles/types";
import { cn } from "@/lib/utils";

function formatProfileName(profile: InternalProfile): string {
  return `${profile.firstname} ${profile.lastname}`;
}

export function InternalProfileCombobox({
  value,
  onValueChange,
  ariaInvalid,
  className,
}: {
  value: string;
  onValueChange: (next: string) => void;
  ariaInvalid?: boolean;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Remembered separately from the live search results: once the user picks
  // someone, a later keystroke can filter that person out of `profiles` —
  // without this, the trigger would fall back to the placeholder mid-search
  // even though a value is still selected.
  const [selected, setSelected] = useState<InternalProfile | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timeout);
  }, [query]);

  // Derived, not synced via effect: when the parent externally clears `value`
  // (e.g. form.reset()), `selected` may still hold the stale profile object —
  // masking it here means the trigger and the Combobox both correctly show
  // "nothing selected" without a setState-in-effect render pass. `selected`
  // itself is left stale until the next real pick, which is harmless since
  // it's never read while `value` is empty.
  const displayed = value === "" ? null : selected;

  const { data } = useInternalProfileList(1, 20, debouncedQuery || undefined);
  const profiles = data?.data ?? [];

  return (
    <Combobox
      items={profiles}
      itemToStringLabel={(p: InternalProfile) => formatProfileName(p)}
      isItemEqualToValue={(item: InternalProfile, val: InternalProfile) => item.id === val.id}
      value={displayed}
      onValueChange={(next: InternalProfile | null) => {
        setSelected(next);
        onValueChange(next ? String(next.id) : "");
      }}
      onInputValueChange={setQuery}
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
              <ComboboxValue placeholder="เลือกผู้รับผิดชอบ">
                {(v: InternalProfile | null) => (v ? formatProfileName(v) : "เลือกผู้รับผิดชอบ")}
              </ComboboxValue>
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
        <ComboboxEmpty>ไม่พบพนักงานที่ค้นหา</ComboboxEmpty>
        <ComboboxList>
          {(item: InternalProfile) => (
            <ComboboxItem key={item.id} value={item}>
              {formatProfileName(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning `internal-profile-combobox.tsx`.

Run: `npx eslint components/internal-profile-combobox.tsx`
Expected: no output.

This component has no consumer yet — it's exercised end-to-end in Task 5/6's manual QA once it's wired into the dialog.

---

## Task 3: `ProcurementMethodCombobox` — fixed list + free-text add

**Files:**
- Create: `app/dashboard/tender-projects/_data/procurement-methods.ts`
- Create: `app/dashboard/tender-projects/_components/procurement-method-combobox.tsx`

**Interfaces:**
- Produces: `PROCUREMENT_METHODS: string[]`, `ProcurementMethodCombobox({ value, onValueChange })` where `value`/`onValueChange` are plain strings (the free-typed or picked method name).

This copies `app/(public)/profiles/vendor-info/_components/business-type-combobox.tsx` structure exactly (same "+ เพิ่ม" custom-entry affordance), since the backend field (`procurementMethod`) is a plain string with no enum constraint — same shape as `businessType`.

- [ ] **Step 1: Create the data file**

Create `app/dashboard/tender-projects/_data/procurement-methods.ts`:

```ts
export const PROCUREMENT_METHODS = [
  "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
  "ตลาดอิเล็กทรอนิกส์ (e-market)",
  "คัดเลือก",
  "เฉพาะเจาะจง",
];
```

- [ ] **Step 2: Create the combobox component**

Create `app/dashboard/tender-projects/_components/procurement-method-combobox.tsx`:

```tsx
"use client";

import { useState, type ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxSeparator, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { PROCUREMENT_METHODS } from "../_data/procurement-methods";

export function ProcurementMethodCombobox({
  value,
  onValueChange,
  ...field
}: {
  value: string;
  onValueChange: (next: string) => void;
} & Omit<
  ComponentProps<typeof Combobox<string>>,
  "items" | "value" | "onValueChange" | "onInputValueChange" | "children"
>) {
  const [query, setQuery] = useState("");

  const canAdd = query.trim().length > 0 && !PROCUREMENT_METHODS.some(
    (method) => method.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <Combobox
      items={PROCUREMENT_METHODS}
      value={value}
      onValueChange={(next) => onValueChange(next ?? "")}
      onInputValueChange={setQuery}
      {...field}
    >
      <ComboboxTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between font-normal text-black data-popup-open:border-gray-700 hover:bg-transparent data-placeholder:text-gray-400"
          >
            <span className="min-w-0 truncate">
              <ComboboxValue placeholder="เลือกวิธีจัดซื้อ" />
            </span>
            <ChevronDown />
          </Button>
        }
        className="h-10 rounded-sm bg-transparent"
      />
      <ComboboxContent>
        <ComboboxInput
          showTrigger={false}
          placeholder="ค้นหาวิธีจัดซื้อ"
          className="
          bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
          has-[[data-slot=input-group-control]:focus-visible]:border-transparent
          has-[[data-slot=input-group-control]:focus-visible]:ring-0
          "
        />
        <ComboboxEmpty>ไม่พบตัวเลือกที่ตรงกัน</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
        {canAdd && (
          <>
            <ComboboxSeparator />
            <ComboboxList>
              <ComboboxItem value={query.trim()} className="cursor-pointer">
                {`+ เพิ่ม "${query.trim()}"`}
              </ComboboxItem>
            </ComboboxList>
          </>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning either new file.

Run: `npx eslint app/dashboard/tender-projects/_data/procurement-methods.ts app/dashboard/tender-projects/_components/procurement-method-combobox.tsx`
Expected: no output.

---

## Task 4: Zod schema + `useCreateTenderProjectForm` hook

**Files:**
- Create: `app/dashboard/tender-projects/_schemas/schema.ts`
- Create: `app/dashboard/tender-projects/_hooks/use-create-tender-project-form.ts`

**Interfaces:**
- Consumes: `useCreateTenderProject()` from Task 1, `CreateTenderProjectPayload` from Task 1.
- Produces: `CreateTenderProjectSchema` (zod schema), `CreateTenderProjectFormValues` (type — every field is a `string`, since every control in this form, including the number/date ones, holds string values in form state and gets converted to the typed payload only at submit), `useCreateTenderProjectForm(onSubmitted: () => void)` returning `{ ...useForm() result, onSubmit, isSubmitting }`.

- [ ] **Step 1: Write the zod schema**

Create `app/dashboard/tender-projects/_schemas/schema.ts`:

```ts
import { z } from "zod";

export const CreateTenderProjectSchema = z
  .object({
    name: z.string().min(1, "กรุณากรอกชื่อโครงการ").max(255, "ชื่อโครงการต้องไม่เกิน 255 ตัวอักษร"),
    description: z.string().optional(),
    budget: z
      .string()
      .min(1, "กรุณากรอกงบประมาณ")
      .refine(
        (v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 999999999999.99,
        "งบประมาณไม่ถูกต้อง",
      ),
    departmentId: z.string().min(1, "กรุณาเลือกแผนก"),
    personInChargeId: z.string().optional(),
    procurementMethod: z.string().min(1, "กรุณาเลือกวิธีจัดซื้อ").max(255, "วิธีจัดซื้อต้องไม่เกิน 255 ตัวอักษร"),
    fiscalYear: z.string().min(1, "กรุณาเลือกปีงบประมาณ"),
    projectStartAt: z.string().optional(),
    projectEndAt: z.string().optional(),
  })
  .refine(
    (values) =>
      !values.projectStartAt || !values.projectEndAt || values.projectEndAt >= values.projectStartAt,
    { message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น", path: ["projectEndAt"] },
  );

export type CreateTenderProjectFormValues = z.infer<typeof CreateTenderProjectSchema>;
```

`projectStartAt`/`projectEndAt` are stored as `"yyyy-MM-dd"` strings, which compare correctly with plain `>=` (ISO date strings sort lexicographically the same as chronologically).

- [ ] **Step 2: Verify the schema compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning `_schemas/schema.ts`.

- [ ] **Step 3: Write the form hook**

Create `app/dashboard/tender-projects/_hooks/use-create-tender-project-form.ts`:

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateTenderProject } from "@/lib/tender/tender-projects/mutations/useCreateTenderProject";
import type { CreateTenderProjectPayload } from "@/lib/tender/tender-projects/types";
import { CreateTenderProjectSchema, type CreateTenderProjectFormValues } from "../_schemas/schema";

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

  return message ?? "สร้างโครงการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;

const DEFAULT_VALUES: CreateTenderProjectFormValues = {
  name: "",
  description: "",
  budget: "",
  departmentId: "",
  personInChargeId: "",
  procurementMethod: "",
  fiscalYear: String(CURRENT_BUDDHIST_YEAR + 1),
  projectStartAt: "",
  projectEndAt: "",
};

export function useCreateTenderProjectForm(onSubmitted: () => void) {
  const createTenderProjectMutation = useCreateTenderProject();

  const form = useForm<CreateTenderProjectFormValues>({
    resolver: zodResolver(CreateTenderProjectSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreateTenderProjectPayload = {
      name: values.name,
      description: values.description || undefined,
      budget: Number(values.budget),
      departmentId: Number(values.departmentId),
      personInChargeId: values.personInChargeId ? Number(values.personInChargeId) : undefined,
      procurementMethod: values.procurementMethod,
      fiscalYear: Number(values.fiscalYear),
      projectStartAt: values.projectStartAt || undefined,
      projectEndAt: values.projectEndAt || undefined,
    };

    const promise = createTenderProjectMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังสร้างโครงการ...",
      success: (data) => {
        form.reset(DEFAULT_VALUES);
        onSubmitted();
        return `สร้างโครงการสำเร็จ (${data.projectCode})`;
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createTenderProjectMutation.isPending,
  };
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning either new file.

Run: `npx eslint app/dashboard/tender-projects/_schemas/schema.ts app/dashboard/tender-projects/_hooks/use-create-tender-project-form.ts`
Expected: no output.

---

## Task 5: `CreateTenderProjectDialog` component

**Files:**
- Create: `app/dashboard/tender-projects/_components/create-tender-project-dialog.tsx`

**Interfaces:**
- Consumes: `useCreateTenderProjectForm` (Task 4), `InternalProfileCombobox` (Task 2), `ProcurementMethodCombobox` (Task 3), `DepartmentSelect` from `@/components/department-select` (existing) + `useDepartmentOptions` from `@/lib/internal-profiles/queries/useDepartmentOptions` (existing).
- Produces: `CreateTenderProjectDialog()` — a component with no props, self-contained trigger + dialog (same shape as `EditDepartmentDialog`/`InternalProfileFormDialog`).

- [ ] **Step 1: Create the component**

Create `app/dashboard/tender-projects/_components/create-tender-project-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { format, parse } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import {
    Dialog, DialogClose, DialogContent,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputField } from "@/components/input-field";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DepartmentSelect } from "@/components/department-select";
import { InternalProfileCombobox } from "@/components/internal-profile-combobox";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { useCreateTenderProjectForm } from "../_hooks/use-create-tender-project-form";
import { ProcurementMethodCombobox } from "./procurement-method-combobox";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

function parseDateParam(value: string | undefined): Date | undefined {
    return value ? parse(value, DATE_PARAM_FORMAT, new Date()) : undefined;
}

const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;
const FISCAL_YEAR_OPTIONS: { value: string; label: string }[] = Array.from(
    { length: 5 },
    (_, i) => {
        const year = CURRENT_BUDDHIST_YEAR + 1 - i;
        return { value: String(year), label: `ปีงบประมาณ ${year}` };
    },
);

export function CreateTenderProjectDialog() {
    const [open, setOpen] = useState(false);
    const { data: departmentOptions } = useDepartmentOptions();

    const {
        register, control, watch, setValue, onSubmit, reset, isSubmitting,
        formState: { errors },
    } = useCreateTenderProjectForm(() => setOpen(false));

    const projectStartAt = watch("projectStartAt");
    const projectEndAt = watch("projectEndAt");

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
                    <Button className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10 flex-1" />
                }
            >
                <Plus />
                <p>สร้างโครงการใหม่</p>
            </DialogTrigger>

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>สร้างโครงการจัดซื้อจัดจ้างใหม่</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <InputField label="ชื่อโครงการ" error={errors.name?.message}>
                        <Input {...register("name")} aria-invalid={!!errors.name} className="h-10 rounded-sm" />
                    </InputField>

                    <InputField label="รายละเอียด" error={errors.description?.message}>
                        <Textarea
                            {...register("description")}
                            aria-invalid={!!errors.description}
                            className="rounded-sm"
                        />
                    </InputField>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <InputField label="งบประมาณ" error={errors.budget?.message}>
                            <Input
                                {...register("budget")}
                                type="number"
                                step="0.01"
                                min="0"
                                aria-invalid={!!errors.budget}
                                className="h-10 rounded-sm"
                            />
                        </InputField>

                        <Controller
                            control={control}
                            name="departmentId"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="แผนก" error={errors.departmentId?.message}>
                                    <DepartmentSelect
                                        departments={departmentOptions ?? []}
                                        value={value}
                                        onValueChange={onChange}
                                        ariaInvalid={!!errors.departmentId}
                                    />
                                </InputField>
                            )}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={control}
                            name="personInChargeId"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="ผู้รับผิดชอบ" error={errors.personInChargeId?.message}>
                                    <InternalProfileCombobox
                                        value={value ?? ""}
                                        onValueChange={onChange}
                                        ariaInvalid={!!errors.personInChargeId}
                                    />
                                </InputField>
                            )}
                        />

                        <Controller
                            control={control}
                            name="procurementMethod"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="วิธีจัดซื้อ" error={errors.procurementMethod?.message}>
                                    <ProcurementMethodCombobox value={value} onValueChange={onChange} />
                                </InputField>
                            )}
                        />
                    </div>

                    <Controller
                        control={control}
                        name="fiscalYear"
                        render={({ field: { value, onChange } }) => (
                            <InputField label="ปีงบประมาณ" error={errors.fiscalYear?.message}>
                                <Select
                                    items={FISCAL_YEAR_OPTIONS}
                                    value={value}
                                    onValueChange={(next) => onChange(next ?? "")}
                                >
                                    <SelectTrigger className="w-full h-10! bg-white rounded-sm">
                                        <SelectValue placeholder="เลือกปีงบประมาณ" />
                                    </SelectTrigger>
                                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                                        {FISCAL_YEAR_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </InputField>
                        )}
                    />

                    <InputField label="ระยะเวลาโครงการ" error={errors.projectEndAt?.message}>
                        <Popover>
                            <PopoverTrigger
                                render={
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10! w-full justify-start gap-2 bg-white font-normal focus:bg-white! aria-expanded:bg-white! hover:bg-white!"
                                    >
                                        <CalendarIcon className="size-4 shrink-0 text-gray-500" />
                                        {projectStartAt || projectEndAt ? (
                                            <span className="truncate">
                                                {projectStartAt
                                                    ? format(parseDateParam(projectStartAt)!, "d MMM yyyy", { locale: th })
                                                    : "..."}
                                                {" ถึง "}
                                                {projectEndAt
                                                    ? format(parseDateParam(projectEndAt)!, "d MMM yyyy", { locale: th })
                                                    : "..."}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">เลือกระยะเวลาโครงการ</span>
                                        )}
                                    </Button>
                                }
                            />
                            <PopoverContent align="start" className="w-auto p-0">
                                <Calendar
                                    mode="range"
                                    locale={th}
                                    captionLayout="dropdown"
                                    numberOfMonths={2}
                                    defaultMonth={parseDateParam(projectStartAt)}
                                    selected={{ from: parseDateParam(projectStartAt), to: parseDateParam(projectEndAt) }}
                                    onSelect={(range) => {
                                        setValue("projectStartAt", range?.from ? format(range.from, DATE_PARAM_FORMAT) : "", {
                                            shouldValidate: true,
                                        });
                                        setValue("projectEndAt", range?.to ? format(range.to, DATE_PARAM_FORMAT) : "", {
                                            shouldValidate: true,
                                        });
                                    }}
                                />
                                <div className="flex justify-end border-t border-border p-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setValue("projectStartAt", "");
                                            setValue("projectEndAt", "");
                                        }}
                                    >
                                        ล้างค่า
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </InputField>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>
                            ยกเลิก
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="bg-red-700 text-white hover:bg-red-600 h-11">
                            สร้างโครงการ
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors mentioning `create-tender-project-dialog.tsx`.

Run: `npx eslint app/dashboard/tender-projects/_components/create-tender-project-dialog.tsx`
Expected: no output.

This component isn't rendered anywhere yet — Task 6 wires it in and is where it gets exercised in the browser.

---

## Task 6: Wire into `page.tsx` + manual QA

**Files:**
- Modify: `app/dashboard/tender-projects/page.tsx`

**Interfaces:**
- Consumes: `CreateTenderProjectDialog` (Task 5).

- [ ] **Step 1: Replace the dead-link button with the dialog**

In `app/dashboard/tender-projects/page.tsx`, find this block (currently around line 116-126):

```tsx
                <div>
                    <Button
                        render={<Link href={routes.dashboards.tender_project.create} />}
                        nativeButton={false}
                        className="font-bold tracking-wider bg-red-700 text-white hover:bg-red-600 h-10 flex-1"
                    >
                        <Plus />
                        <p>สร้างโครงการใหม่</p>
                    </Button>

                </div>
```

Replace it with:

```tsx
                <div>
                    <CreateTenderProjectDialog />
                </div>
```

- [ ] **Step 2: Update imports**

Add, near the other `_components` imports:

```tsx
import { CreateTenderProjectDialog } from "./_components/create-tender-project-dialog";
```

Remove these two imports — nothing else in this file uses them after Step 1:

```tsx
import Link from "next/link";
import { routes } from "@/lib/routes";
```

Also remove `Plus` from the `lucide-react` import line if nothing else in the file uses it (check first — `Search` and `CalendarIcon` are still used elsewhere in this file, only `Plus` is dropped).

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: **no** error on `page.tsx` line ~118 anymore (the `Property 'create' does not exist...` error this whole plan exists to fix). No other new errors mentioning `page.tsx`.

Run: `npx eslint app/dashboard/tender-projects/page.tsx`
Expected: no output (in particular, no "unused import" warnings for `Link`/`routes`/`Plus`).

- [ ] **Step 4: Manual QA in the dev server**

Start the dev server if it isn't running: `npm run dev` (or use whatever the project's existing dev script is — check `package.json` `scripts.dev` first if unsure).

Navigate to `/dashboard/tender-projects` and verify, in order:

1. The "สร้างโครงการใหม่" button opens a dialog (not a navigation) titled "สร้างโครงการจัดซื้อจัดจ้างใหม่".
2. Submitting with everything empty shows Thai validation messages under `ชื่อโครงการ`, `แผนก`, `วิธีจัดซื้อ`, `ปีงบประมาณ`, `งบประมาณ` — the dialog does not close and no network request fires.
3. Typing in "ผู้รับผิดชอบ" triggers a debounced search (network tab: one `GET /api/v1/dashboard/internal-profiles?...search=...` request per pause in typing, not one per keystroke) and picking a result shows their name in the trigger.
4. Picking a value from "วิธีจัดซื้อ" combobox works, and typing a value not in the fixed list shows a `+ เพิ่ม "..."` option that becomes the field's value when clicked.
5. Picking a date range in "ระยะเวลาโครงการ" shows both dates in the trigger button; the "ล้างค่า" button clears both back to the placeholder.
6. Filling in all required fields (name, budget, department, procurement method, fiscal year — person-in-charge and dates stay optional) and submitting: loading toast "กำลังสร้างโครงการ..." appears, then a success toast reading "สร้างโครงการสำเร็จ (TP-...)" with the actual generated project code, the dialog closes, and the new project appears in the table without a manual page reload (confirms the `["tenders_projects"]` query invalidation in Task 1 works).
7. Confirm the stats cards at the top of the page update too (total count increments) — same invalidated query.
8. Re-open the dialog after a successful create: all fields are back to their defaults (blank, except fiscal year defaulting to next year) — confirms `form.reset(DEFAULT_VALUES)` ran.

If step 4.3's network tab isn't easily inspectable in this environment, at minimum confirm the search narrows the dropdown results as you type and doesn't error.

- [ ] **Step 5: Report readiness to commit**

Per the Global Constraints section, do not run `git commit`. Summarize what was verified (tsc clean, eslint clean, manual QA steps 1-8 passed) and stop — wait for the user to explicitly approve committing.

---

## Self-Review Notes

- **Spec coverage:** All 9 form fields (Task 5), both new combobox components (Tasks 2-3), data layer + query invalidation (Task 1), schema + form hook (Task 4), and the `page.tsx` wiring that removes the live `tsc` error (Task 6) are each covered by a task. Out-of-scope items from the spec (edit/delete, lightweight all-profiles endpoint, clearing person-in-charge, promoting the procurement-method combobox to global, status-transition UI) have no corresponding task, as intended.
- **Type consistency:** `CreateTenderProjectPayload` (Task 1) field names match `CreateTenderProjectFormValues` (Task 4) field names match the `register`/`Controller` `name` props used in Task 5's JSX (`name`, `description`, `budget`, `departmentId`, `personInChargeId`, `procurementMethod`, `fiscalYear`, `projectStartAt`, `projectEndAt`) — checked against each other while writing this plan.
- **No placeholders:** every step above has complete, runnable code — no "similar to Task N" shortcuts.
