# Tender Project Edit Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แทนปุ่ม "แก้ไข" ที่ยัง disabled อยู่ในตารางโครงการจัดซื้อจัดจ้าง ด้วย dialog ที่แก้ไขข้อมูลโครงการได้จริง

**Architecture:** เพิ่ม data layer สำหรับ update (`types` → `api` → `useUpdateTenderProject`) แล้วสร้าง `EditTenderProjectDialog` ที่คัดลอกฟอร์มมาจาก `CreateTenderProjectDialog` ทั้งชุด seed ค่าตั้งต้นจาก `row.original` ของแถวในตารางโดยตรงโดยไม่ fetch detail ใหม่ สุดท้ายเสียบ dialog แทน `DisabledActionButton` ใน `columns.tsx`

**Tech Stack:** Next.js (App Router, client components), react-hook-form + zod, TanStack Query, axios, Base UI + shadcn, date-fns, sonner

Spec: [`docs/superpowers/specs/2026-09-10-tender-project-edit-dialog-design.md`](../specs/2026-09-10-tender-project-edit-dialog-design.md)

## Global Constraints

- **ขอบเขต frontend เท่านั้น** — ห้ามแตะไฟล์ใน `backend/` แม้แต่ไฟล์เดียว endpoint `PUT /api/v1/dashboard/tender-projects/{id}` ยังไม่มีจริง เป็น contract ที่วางไว้ให้ plan ฝั่ง backend มาทำต่อ
- **ห้าม commit จนกว่าผู้ใช้จะอนุญาต** — เป็นคำสั่งยืนของผู้ใช้ ทุก task จบที่ staging (`git add`) แล้วรายงาน ไม่ต้อง `git commit` เอง
- **ห้ามแตะ `create-tender-project-dialog.tsx`** — ผู้ใช้เลือกแนวทาง "คัดลอกแยกไฟล์" ไว้ชัดเจน ไม่ extract shared component ไม่ refactor create dialog
- **ไม่มี test runner ในโปรเจกต์นี้** — `package.json` ไม่มี script `test` และไม่มี vitest/jest/playwright ทุก task จึงใช้ `npx tsc --noEmit` + `npx eslint <ไฟล์>` เป็น gate แทน TDD cycle
- **error เดิมที่ค้างอยู่ใน `tsc` 2 จุด ไม่เกี่ยวกับงานนี้ และห้ามแก้:**
  - `app/(auth)/register/page.tsx(129,118): error TS2322`
  - `app/dashboard/internal-employees/departments-positions/page.tsx(18,40): error TS2322`

  เวลาเช็คผลให้ดูเฉพาะไฟล์ที่ตัวเองแตะ ใช้ `npx tsc --noEmit 2>&1 | grep <path>` แล้วต้องไม่มี output
- **ข้อความ UI เป็นภาษาไทยทั้งหมด** ใช้ข้อความตามที่ระบุใน task ตรงตัว ห้ามแต่งใหม่
- ทุกไฟล์ที่เป็น client component ต้องขึ้นต้นด้วย `"use client";`

---

### Task 1: Data layer สำหรับ update

**Files:**
- Modify: `lib/tender/tender-projects/types.ts` (ต่อท้ายไฟล์)
- Modify: `lib/tender/tender-projects/api.ts` (ต่อท้ายไฟล์ + แก้ import block บรรทัด 2-8)
- Create: `lib/tender/tender-projects/mutations/useUpdateTenderProject.ts`

**Interfaces:**
- Consumes: `api` จาก `@/lib/api` (axios instance ที่ตั้ง baseURL + credentials ไว้แล้ว)
- Produces:
  - `UpdateTenderProjectPayload` — interface
  - `updateTenderProject(id: number, payload: UpdateTenderProjectPayload): Promise<{ projectCode: string }>`
  - `useUpdateTenderProject()` — mutation ที่ `mutateAsync` รับ `{ id: number; payload: UpdateTenderProjectPayload }`

- [ ] **Step 1: เพิ่ม `UpdateTenderProjectPayload` ต่อท้าย `lib/tender/tender-projects/types.ts`**

```ts
export interface UpdateTenderProjectPayload {
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

- [ ] **Step 2: แก้ import block ที่หัวไฟล์ `lib/tender/tender-projects/api.ts`**

เปลี่ยนบล็อก import เดิม (บรรทัด 2-8) เป็น — เพิ่ม `UpdateTenderProjectPayload` เข้าไปหนึ่งบรรทัด:

```ts
import {
  CreateTenderProjectPayload,
  PaginatedTenderProjectsList,
  TenderProjects,
  TenderProjectSortBy,
  TenderProjectSortDirection,
  UpdateTenderProjectPayload,
} from "./types";
```

- [ ] **Step 3: เพิ่ม `updateTenderProject` ต่อท้าย `lib/tender/tender-projects/api.ts`**

วางไว้หลัง `fetchTenderProjectDetail` และก่อน `deleteTenderProject` เพื่อให้เรียงตาม CRUD:

```ts
export async function updateTenderProject(
  id: number,
  payload: UpdateTenderProjectPayload,
): Promise<{ projectCode: string }> {
  const { data } = await api.put<{ data: { projectCode: string } }>(
    `/api/v1/dashboard/tender-projects/${id}`,
    payload,
  );
  return data.data;
}
```

- [ ] **Step 4: สร้าง `lib/tender/tender-projects/mutations/useUpdateTenderProject.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTenderProject } from "@/lib/tender/tender-projects/api";
import type { UpdateTenderProjectPayload } from "@/lib/tender/tender-projects/types";

export function useUpdateTenderProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTenderProjectPayload }) =>
      updateTenderProject(id, payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tenders_projects"] }),
  });
}
```

`["tenders_projects"]` เป็น prefix ของทั้ง list (`["tenders_projects", ...filters]`) และ detail (`["tenders_projects", "detail", id]`) การ invalidate key เดียวจึงครอบทั้งสองหน้า — pattern เดียวกับ `useDeleteTenderProject.ts`

- [ ] **Step 5: ตรวจ types**

Run: `npx tsc --noEmit 2>&1 | grep "tender-projects"`
Expected: ไม่มี output

- [ ] **Step 6: ตรวจ lint**

Run: `npx eslint lib/tender/tender-projects/api.ts lib/tender/tender-projects/types.ts lib/tender/tender-projects/mutations/useUpdateTenderProject.ts`
Expected: ไม่มี output

- [ ] **Step 7: Stage (ห้าม commit)**

```bash
git add lib/tender/tender-projects/types.ts lib/tender/tender-projects/api.ts lib/tender/tender-projects/mutations/useUpdateTenderProject.ts
```

รายงานผู้ใช้ว่า task 1 เสร็จและ stage ไว้แล้ว รอคำสั่ง commit

---

### Task 2: Schema + form hook

**Files:**
- Modify: `app/dashboard/tender-projects/_schemas/schema.ts` (ต่อท้ายไฟล์)
- Create: `app/dashboard/tender-projects/_hooks/use-edit-tender-project-form.ts`

**Interfaces:**
- Consumes: `useUpdateTenderProject()` และ `UpdateTenderProjectPayload` จาก Task 1
- Produces:
  - `UpdateTenderProjectSchema` / `UpdateTenderProjectFormValues`
  - `toFormValues(project: TenderProjects): UpdateTenderProjectFormValues`
  - `useEditTenderProjectForm(project: TenderProjects, onSubmitted: () => void)` คืน `{ ...form, onSubmit, isSubmitting }` โดย `form` คือผลจาก `useForm` ของ react-hook-form (มี `register`, `control`, `watch`, `setValue`, `reset`, `formState`)

- [ ] **Step 1: เพิ่ม `UpdateTenderProjectSchema` ต่อท้าย `app/dashboard/tender-projects/_schemas/schema.ts`**

เป็นสำเนาของ `CreateTenderProjectSchema` ตามที่ผู้ใช้เลือกแนวทาง duplicate ไว้ — ห้ามเขียนเป็น alias (`export const UpdateTenderProjectSchema = CreateTenderProjectSchema`) เพราะจงใจให้กฎของ edit แยกออกจาก create ได้ในอนาคต:

```ts
export const UpdateTenderProjectSchema = z
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

export type UpdateTenderProjectFormValues = z.infer<typeof UpdateTenderProjectSchema>;
```

- [ ] **Step 2: สร้าง `app/dashboard/tender-projects/_hooks/use-edit-tender-project-form.ts`**

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateTenderProject } from "@/lib/tender/tender-projects/mutations/useUpdateTenderProject";
import type { TenderProjects, UpdateTenderProjectPayload } from "@/lib/tender/tender-projects/types";
import { UpdateTenderProjectSchema, type UpdateTenderProjectFormValues } from "../_schemas/schema";

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

  return message ?? "บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

// API ส่ง shape ที่ไม่ตรงกับฟอร์ม 4 จุด: budget มี ".00" ห้อยท้าย, วันที่เป็น ISO,
// department/personInCharge เป็น object ส่วนฟอร์มเก็บทุกอย่างเป็น string
export function toFormValues(project: TenderProjects): UpdateTenderProjectFormValues {
  return {
    name: project.name,
    description: project.description ?? "",
    budget: project.budget ? String(Number(project.budget)) : "",
    departmentId: project.department?.id ? String(project.department.id) : "",
    personInChargeId: project.personInCharge?.id ? String(project.personInCharge.id) : "",
    procurementMethod: project.procurementMethod,
    fiscalYear: project.fiscalYear,
    projectStartAt: project.projectStartAt?.slice(0, 10) ?? "",
    projectEndAt: project.projectEndAt?.slice(0, 10) ?? "",
  };
}

export function useEditTenderProjectForm(project: TenderProjects, onSubmitted: () => void) {
  const updateTenderProjectMutation = useUpdateTenderProject();

  const form = useForm<UpdateTenderProjectFormValues>({
    resolver: zodResolver(UpdateTenderProjectSchema),
    defaultValues: toFormValues(project),
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: UpdateTenderProjectPayload = {
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

    const promise = updateTenderProjectMutation.mutateAsync({ id: project.id, payload });

    toast.promise(promise, {
      loading: "กำลังบันทึกการแก้ไข...",
      success: () => {
        onSubmitted();
        return "บันทึกการแก้ไขสำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateTenderProjectMutation.isPending,
  };
}
```

**หมายเหตุสำคัญ — ห้ามใส่ `useEffect` ที่เฝ้า `project` แล้ว `reset()`** react-query สร้าง object ใหม่ทุกครั้งที่ refetch (เช่นตอนสลับ tab กลับมา) `useEffect` แบบนั้นจะล้างค่าที่ผู้ใช้กำลังพิมพ์ค้างไว้ การ re-seed จะไปทำที่ `onOpenChange` ของ dialog ใน Task 3 แทน

- [ ] **Step 3: ตรวจ types**

Run: `npx tsc --noEmit 2>&1 | grep "tender-projects"`
Expected: ไม่มี output

- [ ] **Step 4: ตรวจ lint**

Run: `npx eslint app/dashboard/tender-projects/_schemas/schema.ts app/dashboard/tender-projects/_hooks/use-edit-tender-project-form.ts`
Expected: ไม่มี output

- [ ] **Step 5: Stage (ห้าม commit)**

```bash
git add app/dashboard/tender-projects/_schemas/schema.ts app/dashboard/tender-projects/_hooks/use-edit-tender-project-form.ts
```

---

### Task 3: `EditTenderProjectDialog`

**Files:**
- Create: `app/dashboard/tender-projects/_components/edit-tender-project-dialog.tsx`

**Interfaces:**
- Consumes: `useEditTenderProjectForm`, `toFormValues` จาก Task 2
- Produces: `EditTenderProjectDialog({ project, trigger, triggerChildren })` — props ตรงกับ pattern ของ `DeleteTenderProjectDialog` เพื่อให้ `columns.tsx` ใน Task 4 ส่ง `<Button />` เปล่ากับไอคอนเข้ามาได้

- [ ] **Step 1: สร้าง `app/dashboard/tender-projects/_components/edit-tender-project-dialog.tsx`**

คัดลอกโครงจาก `create-tender-project-dialog.tsx` ทั้งชุดรวม helper ต่างกัน 4 จุดคือ ชื่อ dialog / ข้อความปุ่ม submit / รับ `trigger` จากภายนอกแทนปุ่มสีแดงในตัว / `onOpenChange` reset กลับเป็นค่าเดิมของโครงการ

```tsx
"use client";

import { useState, type ChangeEvent, type ReactElement, type ReactNode } from "react";
import { Controller } from "react-hook-form";
import { format, parse } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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
import type { TenderProjects } from "@/lib/tender/tender-projects/types";
import { toFormValues, useEditTenderProjectForm } from "../_hooks/use-edit-tender-project-form";
import { ProcurementMethodCombobox } from "./procurement-method-combobox";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

function parseDateParam(value: string | undefined): Date | undefined {
    return value ? parse(value, DATE_PARAM_FORMAT, new Date()) : undefined;
}

// Keeps at most one "." and caps the decimal part at 2 digits (matches the budget schema's precision).
function sanitizeBudgetInput(input: string): string {
    const cleaned = input.replace(/[^\d.]/g, "");
    const dotIndex = cleaned.indexOf(".");
    if (dotIndex === -1) return cleaned;

    const intPart = cleaned.slice(0, dotIndex);
    const decPart = cleaned.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
    return `${intPart}.${decPart}`;
}

function formatBudgetDisplay(raw: string): string {
    if (raw === "") return "";
    const [intPart, decPart] = raw.split(".");
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
}

// Reformatting on every keystroke shifts the comma positions, which would
// otherwise throw a mid-edit cursor to the end of the input — this keeps it
// pinned to the same digit by counting digits (not raw characters) to its left.
function handleBudgetChange(onChange: (value: string) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const cursorPos = input.selectionStart ?? input.value.length;
        const digitsBeforeCursor = input.value.slice(0, cursorPos).replace(/[^\d.]/g, "").length;

        const raw = sanitizeBudgetInput(input.value);
        onChange(raw);

        requestAnimationFrame(() => {
            const formatted = formatBudgetDisplay(raw);
            let count = 0;
            let pos = formatted.length;
            for (let i = 0; i < formatted.length; i++) {
                if (/[\d.]/.test(formatted[i])) count++;
                if (count === digitsBeforeCursor) {
                    pos = i + 1;
                    break;
                }
            }
            if (digitsBeforeCursor === 0) pos = 0;
            input.setSelectionRange(pos, pos);
        });
    };
}

const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;
const FISCAL_YEAR_OPTIONS: { value: string; label: string }[] = Array.from(
    { length: 5 },
    (_, i) => {
        const year = CURRENT_BUDDHIST_YEAR + 1 - i;
        return { value: String(year), label: `ปีงบประมาณ ${year}` };
    },
);

export function EditTenderProjectDialog({
    project,
    trigger,
    triggerChildren,
}: {
    project: TenderProjects;
    trigger: ReactElement;
    triggerChildren: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const { data: departmentOptions } = useDepartmentOptions();

    const {
        register, control, watch, setValue, onSubmit, reset, isSubmitting,
        formState: { errors },
    } = useEditTenderProjectForm(project, () => setOpen(false));

    const projectStartAt = watch("projectStartAt");
    const projectEndAt = watch("projectEndAt");

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                // re-seed ทั้งขาเปิดและขาปิด: เปิดมาเห็นค่าล่าสุดเสมอ
                // และปิดแล้วค่าที่แก้ค้างไว้ไม่ตกค้างไปรอบหน้า
                reset(toFormValues(project));
            }}
        >
            <DialogTrigger render={trigger}>{triggerChildren}</DialogTrigger>

            <DialogContent className="sm:max-w-2xl scrollbar-rounded">
                <DialogHeader>
                    <DialogTitle>แก้ไขโครงการจัดซื้อจัดจ้าง</DialogTitle>
                </DialogHeader>

                <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                    <InputField label="ชื่อโครงการ" required error={errors.name?.message}>
                        <Input {...register("name")} aria-invalid={!!errors.name} className="h-10 rounded-sm" />
                    </InputField>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={control}
                            name="departmentId"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="แผนก" required error={errors.departmentId?.message}>
                                    <DepartmentSelect
                                        departments={departmentOptions ?? []}
                                        value={value}
                                        onValueChange={onChange}
                                        ariaInvalid={!!errors.departmentId}
                                    />
                                </InputField>
                            )}
                        />

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
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <InputField label="งบประมาณ" required error={errors.budget?.message}>
                            <Controller
                                control={control}
                                name="budget"
                                render={({ field: { value, onChange, ...field } }) => (
                                    <Input
                                        value={formatBudgetDisplay(value ?? "")}
                                        onChange={handleBudgetChange(onChange)}
                                        inputMode="decimal"
                                        aria-invalid={!!errors.budget}
                                        className="h-10 rounded-sm"
                                        {...field}
                                    />
                                )}
                            />
                        </InputField>

                        <Controller
                            control={control}
                            name="procurementMethod"
                            render={({ field: { value, onChange } }) => (
                                <InputField label="วิธีจัดซื้อ" required error={errors.procurementMethod?.message}>
                                    <ProcurementMethodCombobox ariaInvalid={!!errors.procurementMethod} value={value} onValueChange={onChange} />
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

                    <InputField label="ระยะเวลาโครงการ" required error={errors.projectEndAt?.message}>
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

                    <InputField label="รายละเอียด" error={errors.description?.message}>
                        <Textarea
                            {...register("description")}
                            aria-invalid={!!errors.description}
                            className="rounded-sm"
                        />
                    </InputField>

                    <DialogFooter>
                        <DialogClose render={<Button type="button" variant="outline" className="h-11 md:w-20" />}>
                            ยกเลิก
                        </DialogClose>
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

- [ ] **Step 2: ตรวจ types**

Run: `npx tsc --noEmit 2>&1 | grep "edit-tender-project-dialog"`
Expected: ไม่มี output

- [ ] **Step 3: ตรวจ lint**

Run: `npx eslint app/dashboard/tender-projects/_components/edit-tender-project-dialog.tsx`
Expected: ไม่มี output

- [ ] **Step 4: Stage (ห้าม commit)**

```bash
git add app/dashboard/tender-projects/_components/edit-tender-project-dialog.tsx
```

---

### Task 4: เสียบ dialog เข้าตาราง

**Files:**
- Modify: `app/dashboard/tender-projects/_components/table/columns.tsx` (import block บรรทัด 12-14 และ cell `actions` บรรทัด 118)

**Interfaces:**
- Consumes: `EditTenderProjectDialog` จาก Task 3

- [ ] **Step 1: แก้ import ใน `columns.tsx`**

ลบบรรทัด `import { DisabledActionButton } from "@/components/disabled-action-button";` (บรรทัด 12) แล้วเพิ่ม import ของ dialog ต่อจาก `DeleteTenderProjectDialog` — ผลลัพธ์ของบล็อกบรรทัด 12-14 คือ:

```tsx
import { routes } from "@/lib/routes";
import { DeleteTenderProjectDialog } from "../delete-tender-project-dialog";
import { EditTenderProjectDialog } from "../edit-tender-project-dialog";
```

ไม่ต้องแตะ `import { Pencil }` จาก lucide-react ที่บรรทัด 4 เพราะยังใช้เป็นไอคอนของ trigger

**ห้ามลบไฟล์ `components/disabled-action-button.tsx`** — หลังจากนี้จะไม่มีไฟล์ไหนใช้ แต่เป็น placeholder กลางที่หน้าอื่นจะหยิบไปใช้ การลบอยู่นอกขอบเขต plan นี้

- [ ] **Step 2: แทน `DisabledActionButton` ใน cell `actions`**

เปลี่ยนบรรทัด 118 จาก `<DisabledActionButton icon={Pencil} label="แก้ไข" />` เป็น:

```tsx
<EditTenderProjectDialog
    project={row.original}
    trigger={
        <Button
            variant="outline"
            aria-label="แก้ไขโครงการ"
            className="size-8 px-1.5 pt-px rounded-md bg-white"
        />
    }
    triggerChildren={<Pencil className="w-4 h-4 text-gray-500" />}
/>
```

className ของปุ่มตรงกับปุ่ม "ดูรายละเอียด" และ "ลบโครงการ" ในแถวเดียวกัน เพื่อให้ทั้ง 3 ปุ่มขนาดเท่ากัน

- [ ] **Step 3: ตรวจ types**

Run: `npx tsc --noEmit 2>&1 | grep "columns"`
Expected: ไม่มี output

- [ ] **Step 4: ตรวจ lint**

Run: `npx eslint app/dashboard/tender-projects/_components/table/columns.tsx`
Expected: ไม่มี output — โดยเฉพาะต้องไม่มี warning `'DisabledActionButton' is defined but never used`

- [ ] **Step 5: ตรวจ build ทั้งโปรเจกต์**

Run: `npx next build`
Expected: build สำเร็จ ไม่มี error

- [ ] **Step 6: Stage (ห้าม commit)**

```bash
git add app/dashboard/tender-projects/_components/table/columns.tsx
```

- [ ] **Step 7: ส่ง manual QA checklist ให้ผู้ใช้**

เครื่อง dev นี้ไม่มี browser automation จึงยืนยันบนหน้าจอเองไม่ได้ ให้รายงานผู้ใช้พร้อมรายการที่ต้องตรวจ:

1. เปิด dialog แล้วทุกช่องมีค่าเดิมของโครงการครบ — งบประมาณต้องไม่มี `.00` ห้อยท้าย และ calendar ต้องไฮไลต์ช่วงวันที่ถูก
2. โครงการที่ไม่มีผู้รับผิดชอบ หรือไม่มีวันที่เริ่ม/สิ้นสุด ต้องเปิด dialog ได้ไม่พัง
3. แก้ค่าแล้วกด "ยกเลิก" หรือปิด dialog แล้วเปิดใหม่ ต้องเห็นค่าเดิมของโครงการ ไม่ใช่ค่าที่แก้ค้างไว้
4. validation ทำงาน — ชื่อว่าง, งบประมาณเกินเพดาน, วันสิ้นสุดก่อนวันเริ่ม
5. โครงการที่ `fiscalYear` เก่ากว่า 5 ปีย้อนหลัง ช่องปีงบประมาณจะว่าง ต้องเลือกใหม่ก่อนบันทึก — เป็นพฤติกรรมที่ยอมรับไว้ใน spec ไม่ใช่ bug

**ข้อจำกัดที่ยืนยันไม่ได้ในรอบนี้:** endpoint ยังไม่มีจริง กดบันทึกจะได้ error toast (405 Method Not Allowed) เสมอ — path ที่บันทึกสำเร็จ, การปิด dialog หลังสำเร็จ และการ invalidate query จะทดสอบได้หลัง backend plan เสร็จ

---

## สิ่งที่อยู่นอกขอบเขต plan นี้

- Backend endpoint, request validation, use case, repository, policy, tests
- Permission `tender-projects.update` ในตาราง permission และการ seed
- ปุ่มแก้ไขบนหน้า detail (`app/dashboard/tender-projects/detail/page.tsx`)
- หน้า edit แบบเต็มหน้าจอ — `routes.dashboards.tender_project.edit(id)` ใน `lib/routes.ts` ยังไม่มีหน้ารองรับ ไม่แตะและไม่ลบ
- ขยาย `FISCAL_YEAR_OPTIONS` ให้ครอบคลุมปีงบประมาณเก่า
- Extract shared form component ระหว่าง create กับ edit
- ลบ `components/disabled-action-button.tsx`
