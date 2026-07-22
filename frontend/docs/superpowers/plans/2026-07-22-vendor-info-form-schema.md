# Vendor Info Form Schema + Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the vendor-info page ("ข้อมูลบริษัท / นิติบุคคล") real client-side validation by wiring it to `react-hook-form` + `zod`, following the same schema+hook convention already used by `account-info`/`change-password`/`add-contact`. Submit is validation-only for now (backend endpoint is a stub) — a valid submit just logs the values.

**Architecture:** Two zod schemas (`VendorCompanyInfoSchema`, `VendorIndividualInfoSchema`) are appended to the existing route-scoped `_schemas/schema.ts`. Two hooks (`useVendorCompanyInfoForm`, `useVendorIndividualInfoForm`) each wrap `useForm` + `zodResolver` around one schema. Because `vendor.detail` is a discriminated union and React hooks can't be called conditionally, two separate presentational components (`CompanyInfoForm`, `IndividualInfoForm`) each call their own hook and render their own field set — mirroring the `type === "company"` branch that already exists in the page. `vendor-info/page.tsx` shrinks to just fetching the vendor profile and picking which component to render. A shared `formatThaiId` helper (currently inlined in `page.tsx`) moves to its own file since both components need it identically.

**Tech Stack:** Next.js (App Router, client components), `react-hook-form` + `@hookform/resolvers/zod` + `zod` (already in `package.json`, no install needed), `@base-ui/react`-backed `Combobox`/`Select` (`components/ui/combobox.tsx`, `components/ui/select.tsx` — both already support controlled `value`/`onValueChange`, confirmed against `node_modules/@base-ui/react/{combobox,select}/root/*.d.ts`), Tailwind v4.

## Global Constraints

- No test runner is configured in this repo (`package.json` has no vitest/jest/playwright, no `*.test.ts` files exist). Do not add a test framework. Verification is `npx tsc --noEmit`, `npm run lint`, and manual browser checks via the dev server.
- Follow the existing form convention verbatim: route-scoped `_schemas/schema.ts` (zod object + inferred `z.infer` type) + route-scoped `_hooks/use-<name>-form.ts` (wraps `useForm` with `zodResolver`, returns `{ ...form, onSubmit }`) + component using `register(...)`/`Controller` and `error={errors.field?.message}` through the existing `InputField`. Reference: `app/(public)/profiles/_hooks/use-account-info-form.ts`, `app/(public)/profiles/contract/_hooks/use-add-contact-form.ts`.
- Backend `updateVendorInfo` is a stub (`UpdateVendorInfoRequest::rules()` returns `[]`, controller method body is empty, no route registered). Do not add an API call or `useMutation`. A valid submit only calls `console.log(values)` — same placeholder as `useAddContactForm`.
- `VendorIndividualProfileDetail.email`/`.phone` and `VendorCompanyProfileDetail.country` exist on the TypeScript type (`lib/vendor/types.ts`) but are never rendered on this page — do not add them to the schemas or forms (YAGNI).
- Required fields (mirrors the `warning={!vendor.detail.x}` dots already in the current JSX):
  - Company: `companyName`, `businessType`, `businessRegistrationNo`, `taxId`, `address`, `province`, `postalCode` required; `branchNo` optional.
  - Individual: `storeName`, `businessType`, `firstname`, `lastname`, `citizenId`, `address`, `province`, `postalCode` required; `prefix`, `taxId` optional.
- Keep the pre-existing `warning` dot on every field that has one today (it reflects the vendor's saved data being empty, independent of live validation) — add `error={errors.field?.message}` alongside it, don't replace it.
- Two separate hooks and two separate components for company vs. individual — not one hook driving a union schema (React hooks can't be called conditionally).

---

### Task 1: Vendor info schemas

**Files:**
- Modify: `app/(public)/profiles/_schemas/schema.ts` (append to end of file)

**Interfaces:**
- Consumes: `z` from `zod`, already imported at the top of this file.
- Produces (used by Task 3):
  - `VendorCompanyInfoSchema` — `z.object(...)` with keys `companyName: string`, `businessType: string`, `branchNo: string (optional)`, `businessRegistrationNo: string`, `taxId: string`, `address: string`, `province: string`, `postalCode: string`.
  - `VendorCompanyInfoValues` — `z.infer<typeof VendorCompanyInfoSchema>`.
  - `VendorIndividualInfoSchema` — `z.object(...)` with keys `storeName: string`, `businessType: string`, `prefix: string (optional)`, `firstname: string`, `lastname: string`, `citizenId: string`, `taxId: string (optional)`, `address: string`, `province: string`, `postalCode: string`.
  - `VendorIndividualInfoValues` — `z.infer<typeof VendorIndividualInfoSchema>`.

- [ ] **Step 1: Append the two schemas to the file**

Add this to the end of `app/(public)/profiles/_schemas/schema.ts` (the file already starts with `import { z } from "zod";` and already has `AccountInfoSchema`/`ChangePasswordSchema` above — don't touch those, just append below):

```ts
export const VendorCompanyInfoSchema = z.object({
  companyName: z.string().min(1, "กรุณากรอกชื่อบริษัท / นิติบุคคล"),
  businessType: z.string().min(1, "กรุณาเลือกประเภทธุรกิจ"),
  branchNo: z.string().optional(),
  businessRegistrationNo: z.string().min(1, "กรุณากรอกเลขทะเบียนนิติบุคคล"),
  taxId: z.string().min(1, "กรุณากรอกเลขผู้เสียภาษี"),
  address: z.string().min(1, "กรุณากรอกที่อยู่"),
  province: z.string().min(1, "กรุณากรอกจังหวัด"),
  postalCode: z.string().min(1, "กรุณากรอกรหัสไปรษณีย์"),
});

export type VendorCompanyInfoValues = z.infer<typeof VendorCompanyInfoSchema>;

export const VendorIndividualInfoSchema = z.object({
  storeName: z.string().min(1, "กรุณากรอกชื่อร้านค้า"),
  businessType: z.string().min(1, "กรุณาเลือกประเภทธุรกิจ"),
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  citizenId: z.string().min(1, "กรุณากรอกเลขบัตรประชาชน"),
  taxId: z.string().optional(),
  address: z.string().min(1, "กรุณากรอกที่อยู่"),
  province: z.string().min(1, "กรุณากรอกจังหวัด"),
  postalCode: z.string().min(1, "กรุณากรอกรหัสไปรษณีย์"),
});

export type VendorIndividualInfoValues = z.infer<typeof VendorIndividualInfoSchema>;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/_schemas/schema.ts`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/_schemas/schema.ts"
git commit -m "feat(vendor): add vendor info form schemas"
```

---

### Task 2: Thai-ID formatter helper

**Files:**
- Create: `app/(public)/profiles/vendor-info/_lib/format-thai-id.ts`
- Modify: `app/(public)/profiles/vendor-info/page.tsx:1-34` (remove the now-duplicated `formatThaiId`/`handleThaiIdChange` functions and their now-unused `ChangeEvent` import — leave the rest of the file as-is; Task 6 replaces the whole file body anyway, but this keeps the repo compiling after this task on its own)

**Interfaces:**
- Produces (used by Tasks 4 and 5): `formatThaiId(value: string): string` from `app/(public)/profiles/vendor-info/_lib/format-thai-id.ts`.

- [ ] **Step 1: Create the helper file**

```ts
// app/(public)/profiles/vendor-info/_lib/format-thai-id.ts
export function formatThaiId(value: string): string {
  const chars = value
    .toUpperCase()
    .replace(/[^0-9X]/g, "")
    .slice(0, 13);
  return [
    chars.slice(0, 1),
    chars.slice(1, 5),
    chars.slice(5, 10),
    chars.slice(10, 12),
    chars.slice(12, 13),
  ]
    .filter(Boolean)
    .join("-");
}
```

This is moved verbatim from the current `app/(public)/profiles/vendor-info/page.tsx:16-30`.

- [ ] **Step 2: Remove the duplicated function from `page.tsx`**

In `app/(public)/profiles/vendor-info/page.tsx`, delete lines 16-34 (the `formatThaiId` function, the `handleThaiIdChange` function, and the blank line after them) — i.e. everything between the last import and `export default function VendorInfo()`. Also remove the now-unused `import type { ChangeEvent } from "react";` on line 12.

The file will still reference `formatThaiId`/`handleThaiIdChange` further down (lines 119-136, 241-258, etc.) — that's expected and will cause typecheck errors until Task 6 rewrites the rest of the file. Leaving those references dangling for one task is intentional: Task 6 replaces the whole file, so don't try to patch the references here.

- [ ] **Step 3: Typecheck (expect known failures)**

Run: `npx tsc --noEmit`
Expected: Errors in `app/(public)/profiles/vendor-info/page.tsx` about `formatThaiId`/`handleThaiIdChange` not being defined. This is expected — Task 6 fixes them. Confirm there are **no errors** in the new `app/(public)/profiles/vendor-info/_lib/format-thai-id.ts` file itself.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/vendor-info/_lib/format-thai-id.ts" "app/(public)/profiles/vendor-info/page.tsx"
git commit -m "refactor(vendor): extract formatThaiId into shared helper"
```

---

### Task 3: Vendor info form hooks

**Files:**
- Create: `app/(public)/profiles/vendor-info/_hooks/use-vendor-info-form.ts`

**Interfaces:**
- Consumes: `VendorCompanyInfoSchema`, `VendorCompanyInfoValues`, `VendorIndividualInfoSchema`, `VendorIndividualInfoValues` from `../../_schemas/schema` (Task 1); `useForm` from `react-hook-form`; `zodResolver` from `@hookform/resolvers/zod`.
- Produces (used by Tasks 4 and 5):
  - `useVendorCompanyInfoForm(detail: VendorCompanyInfoValues)` — returns `UseFormReturn<VendorCompanyInfoValues> & { onSubmit: () => void }`. Callers use `.register`, `.control`, `.formState.errors`, and `.onSubmit`.
  - `useVendorIndividualInfoForm(detail: VendorIndividualInfoValues)` — returns `UseFormReturn<VendorIndividualInfoValues> & { onSubmit: () => void }`. Same usage shape.

- [ ] **Step 1: Write the hook file**

```ts
// app/(public)/profiles/vendor-info/_hooks/use-vendor-info-form.ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type {
  VendorCompanyInfoValues,
  VendorIndividualInfoValues,
} from "../../_schemas/schema";
import {
  VendorCompanyInfoSchema,
  VendorIndividualInfoSchema,
} from "../../_schemas/schema";

export function useVendorCompanyInfoForm(detail: VendorCompanyInfoValues) {
  const form = useForm<VendorCompanyInfoValues>({
    resolver: zodResolver(VendorCompanyInfoSchema),
    defaultValues: {
      companyName: "",
      businessType: "",
      branchNo: "",
      businessRegistrationNo: "",
      taxId: "",
      address: "",
      province: "",
      postalCode: "",
    },
    values: detail,
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log(values);
  });

  return { ...form, onSubmit };
}

export function useVendorIndividualInfoForm(detail: VendorIndividualInfoValues) {
  const form = useForm<VendorIndividualInfoValues>({
    resolver: zodResolver(VendorIndividualInfoSchema),
    defaultValues: {
      storeName: "",
      businessType: "",
      prefix: "",
      firstname: "",
      lastname: "",
      citizenId: "",
      taxId: "",
      address: "",
      province: "",
      postalCode: "",
    },
    values: detail,
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log(values);
  });

  return { ...form, onSubmit };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/vendor-info/_hooks/use-vendor-info-form.ts`. (Errors in `vendor-info/page.tsx` from Task 2 are still expected and unrelated.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/vendor-info/_hooks/use-vendor-info-form.ts"
git commit -m "feat(vendor): add vendor info form hooks"
```

---

### Task 4: Company info form component

**Files:**
- Create: `app/(public)/profiles/vendor-info/_components/company-info-form.tsx`

**Interfaces:**
- Consumes: `useVendorCompanyInfoForm` from `../_hooks/use-vendor-info-form` (Task 3); `formatThaiId` from `../_lib/format-thai-id` (Task 2); `VendorCompanyInfoValues` type from `../../_schemas/schema` (Task 1); `InputField` from `../../_components/input-field` (existing, unchanged — props `label: string`, `cols?: number`, `error?: string`, `warning?: boolean`, `children: ReactNode`); `BUSINESS_TYPES` from `../../data/business-types` (existing); `Input` from `@/components/ui/input`; `Combobox`/`ComboboxContent`/`ComboboxEmpty`/`ComboboxInput`/`ComboboxItem`/`ComboboxList`/`ComboboxSeparator`/`ComboboxTrigger`/`ComboboxValue` from `@/components/ui/combobox` (existing, controlled via `value`/`onValueChange`); `Button` from `@/components/ui/button`; `ChevronDown` from `lucide-react`; `Controller` from `react-hook-form`.
- Produces (used by Task 6): default export `CompanyInfoForm({ detail: VendorCompanyInfoValues })`.

- [ ] **Step 1: Write the component file**

```tsx
// app/(public)/profiles/vendor-info/_components/company-info-form.tsx
"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { InputField } from "../../_components/input-field";
import { BUSINESS_TYPES } from "../../data/business-types";
import { Input } from "@/components/ui/input";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxSeparator, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { ChangeEvent } from "react";
import { formatThaiId } from "../_lib/format-thai-id";
import { useVendorCompanyInfoForm } from "../_hooks/use-vendor-info-form";
import type { VendorCompanyInfoValues } from "../../_schemas/schema";

export default function CompanyInfoForm({ detail }: { detail: VendorCompanyInfoValues }) {
  const { register, control, onSubmit, formState: { errors } } = useVendorCompanyInfoForm(detail);
  const [businessTypeQuery, setBusinessTypeQuery] = useState("");

  const canAddBusinessType = businessTypeQuery.trim().length > 0 && !BUSINESS_TYPES.some(
    (type) => type.toLowerCase() === businessTypeQuery.trim().toLowerCase()
  );

  function handleThaiIdChange(onChange: (value: string) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => onChange(formatThaiId(e.target.value));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <div className="grid md:grid-cols-4 gap-4 mt-2 md:mt-0">
        <InputField label="ชื่อบริษัท / นิติบุคคล" cols={3} warning={!detail.companyName} error={errors.companyName?.message}>
          <Input {...register("companyName")} aria-invalid={!!errors.companyName} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="ประเภทธุรกิจ" warning={!detail.businessType} error={errors.businessType?.message}>
          <Controller
            control={control}
            name="businessType"
            render={({ field: { value, onChange, ...field } }) => (
              <Combobox
                items={BUSINESS_TYPES}
                value={value}
                onValueChange={onChange}
                onInputValueChange={setBusinessTypeQuery}
                {...field}
              >
                <ComboboxTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal text-black data-popup-open:border-gray-700 hover:bg-transparent data-placeholder:text-gray-400"
                    >
                      <span className="min-w-0 truncate">
                        <ComboboxValue placeholder="เลือกประเภทธุรกิจ" />
                      </span>
                      <ChevronDown />
                    </Button>
                  }
                  className="h-11 rounded-sm bg-transparent"
                />
                <ComboboxContent>
                  <ComboboxInput
                    showTrigger={false}
                    placeholder="ค้นหาประเภทธุรกิจ"
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
                  {canAddBusinessType && (
                    <>
                      <ComboboxSeparator />
                      <ComboboxList>
                        <ComboboxItem value={businessTypeQuery.trim()} className="cursor-pointer">
                          {`+ เพิ่ม "${businessTypeQuery.trim()}"`}
                        </ComboboxItem>
                      </ComboboxList>
                    </>
                  )}
                </ComboboxContent>
              </Combobox>
            )}
          />
        </InputField>

        <InputField label="สาขา" error={errors.branchNo?.message}>
          <Input {...register("branchNo")} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="เลขทะเบียนนิติบุคคล" warning={!detail.businessRegistrationNo} error={errors.businessRegistrationNo?.message}>
          <Controller
            control={control}
            name="businessRegistrationNo"
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                value={value}
                onChange={handleThaiIdChange(onChange)}
                inputMode="numeric"
                maxLength={17}
                placeholder="X-XXXX-XXXXX-XX-X"
                aria-invalid={!!errors.businessRegistrationNo}
                className="h-11 rounded-sm"
                {...field}
              />
            )}
          />
        </InputField>

        <InputField label="เลขผู้เสียภาษี" cols={2} warning={!detail.taxId} error={errors.taxId?.message}>
          <Controller
            control={control}
            name="taxId"
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                value={value}
                onChange={handleThaiIdChange(onChange)}
                inputMode="numeric"
                maxLength={17}
                placeholder="X-XXXX-XXXXX-XX-X"
                aria-invalid={!!errors.taxId}
                className="h-11 rounded-sm"
                {...field}
              />
            )}
          />
        </InputField>

        <div className="hidden md:block" />

        <InputField label="ที่อยู่" cols={4} warning={!detail.address} error={errors.address?.message}>
          <Input {...register("address")} aria-invalid={!!errors.address} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="จังหวัด" cols={2} warning={!detail.province} error={errors.province?.message}>
          <Input {...register("province")} aria-invalid={!!errors.province} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="รหัสไปรษณีย์" cols={2} warning={!detail.postalCode} error={errors.postalCode?.message}>
          <Input {...register("postalCode")} aria-invalid={!!errors.postalCode} className="h-11 rounded-sm" />
        </InputField>
      </div>

      <div className="flex justify-end mt-5">
        <Button type="submit" className="text-white bg-red-700 w-28 h-11 hover:bg-red-600">
          บันทึกข้อมูล
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/vendor-info/_components/company-info-form.tsx`. (Errors in `vendor-info/page.tsx` from Task 2 are still expected and unrelated.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/vendor-info/_components/company-info-form.tsx"
git commit -m "feat(vendor): add CompanyInfoForm component"
```

---

### Task 5: Individual info form component

**Files:**
- Create: `app/(public)/profiles/vendor-info/_components/individual-info-form.tsx`

**Interfaces:**
- Consumes: `useVendorIndividualInfoForm` from `../_hooks/use-vendor-info-form` (Task 3); `formatThaiId` from `../_lib/format-thai-id` (Task 2); `VendorIndividualInfoValues` type from `../../_schemas/schema` (Task 1); `InputField`, `BUSINESS_TYPES` (as in Task 4); `Select`/`SelectContent`/`SelectGroup`/`SelectItem`/`SelectTrigger`/`SelectValue` from `@/components/ui/select` (existing, controlled via `value`/`onValueChange`); same `Combobox`/`Input`/`Button`/`ChevronDown`/`Controller` imports as Task 4.
- Produces (used by Task 6): default export `IndividualInfoForm({ detail: VendorIndividualInfoValues })`.

- [ ] **Step 1: Write the component file**

```tsx
// app/(public)/profiles/vendor-info/_components/individual-info-form.tsx
"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { InputField } from "../../_components/input-field";
import { BUSINESS_TYPES } from "../../data/business-types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxSeparator, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { ChangeEvent } from "react";
import { formatThaiId } from "../_lib/format-thai-id";
import { useVendorIndividualInfoForm } from "../_hooks/use-vendor-info-form";
import type { VendorIndividualInfoValues } from "../../_schemas/schema";

export default function IndividualInfoForm({ detail }: { detail: VendorIndividualInfoValues }) {
  const { register, control, onSubmit, formState: { errors } } = useVendorIndividualInfoForm(detail);
  const [businessTypeQuery, setBusinessTypeQuery] = useState("");

  const canAddBusinessType = businessTypeQuery.trim().length > 0 && !BUSINESS_TYPES.some(
    (type) => type.toLowerCase() === businessTypeQuery.trim().toLowerCase()
  );

  function handleThaiIdChange(onChange: (value: string) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => onChange(formatThaiId(e.target.value));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <div className="grid md:grid-cols-4 gap-4 mt-2 md:mt-0">
        <InputField label="ชื่อร้านค้า" cols={3} warning={!detail.storeName} error={errors.storeName?.message}>
          <Input {...register("storeName")} aria-invalid={!!errors.storeName} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="ประเภทธุรกิจ" warning={!detail.businessType} error={errors.businessType?.message}>
          <Controller
            control={control}
            name="businessType"
            render={({ field: { value, onChange, ...field } }) => (
              <Combobox
                items={BUSINESS_TYPES}
                value={value}
                onValueChange={onChange}
                onInputValueChange={setBusinessTypeQuery}
                {...field}
              >
                <ComboboxTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal text-black data-popup-open:border-gray-700 hover:bg-transparent data-placeholder:text-gray-400"
                    >
                      <span className="min-w-0 truncate">
                        <ComboboxValue placeholder="เลือกประเภทธุรกิจ" />
                      </span>
                      <ChevronDown />
                    </Button>
                  }
                  className="h-11 rounded-sm bg-transparent"
                />
                <ComboboxContent>
                  <ComboboxInput
                    showTrigger={false}
                    placeholder="ค้นหาประเภทธุรกิจ"
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
                  {canAddBusinessType && (
                    <>
                      <ComboboxSeparator />
                      <ComboboxList>
                        <ComboboxItem value={businessTypeQuery.trim()} className="cursor-pointer">
                          {`+ เพิ่ม "${businessTypeQuery.trim()}"`}
                        </ComboboxItem>
                      </ComboboxList>
                    </>
                  )}
                </ComboboxContent>
              </Combobox>
            )}
          />
        </InputField>

        <InputField label="คำนำหน้า">
          <Controller
            control={control}
            name="prefix"
            render={({ field: { value, onChange, ...field } }) => (
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
            )}
          />
        </InputField>

        <InputField label="ชื่อ" warning={!detail.firstname} error={errors.firstname?.message}>
          <Input {...register("firstname")} aria-invalid={!!errors.firstname} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="นามสกุล" warning={!detail.lastname} error={errors.lastname?.message}>
          <Input {...register("lastname")} aria-invalid={!!errors.lastname} className="h-11 rounded-sm" />
        </InputField>

        <div className="hidden md:block" />

        <InputField label="เลขบัตรประชาชน" cols={2} warning={!detail.citizenId} error={errors.citizenId?.message}>
          <Controller
            control={control}
            name="citizenId"
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                value={value}
                onChange={handleThaiIdChange(onChange)}
                inputMode="numeric"
                maxLength={17}
                placeholder="X-XXXX-XXXXX-XX-X"
                aria-invalid={!!errors.citizenId}
                className="h-11 rounded-sm"
                {...field}
              />
            )}
          />
        </InputField>

        <InputField label="เลขผู้เสียภาษี (ถ้ามี)" cols={2} error={errors.taxId?.message}>
          <Controller
            control={control}
            name="taxId"
            render={({ field: { value, onChange, ...field } }) => (
              <Input
                value={value}
                onChange={handleThaiIdChange(onChange)}
                inputMode="numeric"
                maxLength={17}
                placeholder="X-XXXX-XXXXX-XX-X"
                aria-invalid={!!errors.taxId}
                className="h-11 rounded-sm"
                {...field}
              />
            )}
          />
        </InputField>

        <div className="hidden md:block" />

        <InputField label="ที่อยู่" cols={4} warning={!detail.address} error={errors.address?.message}>
          <Input {...register("address")} aria-invalid={!!errors.address} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="จังหวัด" cols={2} warning={!detail.province} error={errors.province?.message}>
          <Input {...register("province")} aria-invalid={!!errors.province} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="รหัสไปรษณีย์" cols={2} warning={!detail.postalCode} error={errors.postalCode?.message}>
          <Input {...register("postalCode")} aria-invalid={!!errors.postalCode} className="h-11 rounded-sm" />
        </InputField>
      </div>

      <div className="flex justify-end mt-5">
        <Button type="submit" className="text-white bg-red-700 w-28 h-11 hover:bg-red-600">
          บันทึกข้อมูล
        </Button>
      </div>
    </form>
  );
}
```

`prefix`'s `value={value || "นาย"}` preserves the current page's fallback (`defaultValue={vendor.detail.prefix || "นาย"}`) for vendors with no prefix saved yet.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors referencing `app/(public)/profiles/vendor-info/_components/individual-info-form.tsx`. (Errors in `vendor-info/page.tsx` from Task 2 are still expected and unrelated.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings for this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/profiles/vendor-info/_components/individual-info-form.tsx"
git commit -m "feat(vendor): add IndividualInfoForm component"
```

---

### Task 6: Wire the two forms into the vendor-info page

**Files:**
- Modify: `app/(public)/profiles/vendor-info/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `CompanyInfoForm` default export from `./_components/company-info-form` (Task 4); `IndividualInfoForm` default export from `./_components/individual-info-form` (Task 5); `useVendorProfile` from `@/lib/vendor/useVendorProfile` (existing, unchanged); `Spinner` from `@/components/ui/spinner` (existing, unchanged); `SectionTitle` from `../_components/section-title` (existing, unchanged).

- [ ] **Step 1: Replace the entire file**

```tsx
// app/(public)/profiles/vendor-info/page.tsx
"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import { Spinner } from "@/components/ui/spinner";
import SectionTitle from "../_components/section-title";
import CompanyInfoForm from "./_components/company-info-form";
import IndividualInfoForm from "./_components/individual-info-form";

export default function VendorInfo() {
  const { data: vendor, isLoading } = useVendorProfile();

  return (
    <div className="flex flex-col">
      <SectionTitle title="ข้อมูลบริษัท / นิติบุคคล" desc="ข้อมูลนี้จะปรากฏในเอกสารการเสนอราคาและสัญญา" />

      {vendor && !isLoading ? (
        vendor.detail.type === "company" ? (
          <CompanyInfoForm detail={vendor.detail} />
        ) : (
          <IndividualInfoForm detail={vendor.detail} />
        )
      ) : (
        <div className="flex justify-center items-center h-70">
          <Spinner className="size-8" />
        </div>
      )}
    </div>
  );
}
```

`vendor.detail` narrows to `VendorCompanyProfileDetail`/`VendorIndividualProfileDetail` (`lib/vendor/types.ts`) via the `type` discriminant check, which structurally satisfies `VendorCompanyInfoValues`/`VendorIndividualInfoValues` (same field names/types, plus a few extra fields the form schemas don't declare — TypeScript allows passing a wider object where a narrower one is expected as long as it's not an object literal).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors anywhere in `app/(public)/profiles/vendor-info/` (this clears the expected failures left over from Task 2).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new lint errors/warnings.

- [ ] **Step 4: Manual browser verification**

Run: `npm run dev`, navigate to the "ข้อมูลบริษัท / นิติบุคคล" tab of the vendor profile section while logged in as a vendor. Repeat for one company-type vendor account and one individual-type vendor account (if only one type is available, note which type was tested and flag the other as unverified).

Verify:
1. All fields populate with the vendor's existing saved values on load (including the ประเภทธุรกิจ combobox and, for individual vendors, the คำนำหน้า select) — same values as before this change.
2. The red `warning` dot still appears next to every field that was already empty in the vendor's saved data (e.g. an unfilled เลขผู้เสียภาษี), regardless of what you type into it afterward.
3. Clear a required field (e.g. ชื่อบริษัท / นิติบุคคล for company, or ชื่อร้านค้า for individual) and click "บันทึกข้อมูล" — its Thai validation error message appears directly under the field and the browser console does not log the values (submit blocked).
4. Fill all required fields with valid values and click "บันทึกข้อมูล" — no error messages appear, and the console logs the submitted values object.
5. Type into เลขทะเบียนนิติบุคคล / เลขผู้เสียภาษี (company) or เลขบัตรประชาชน / เลขผู้เสียภาษี (individual) — confirm the `X-XXXX-XXXXX-XX-X` live formatting still works exactly as before.
6. Type a business type not in the list into the ประเภทธุรกิจ combobox — confirm the `+ เพิ่ม "..."` option still appears and is selectable, and the selected value shows in the trigger.
7. For an individual vendor, confirm the คำนำหน้า select still defaults to "นาย" when no prefix is saved, and switching it to "นาง"/"นางสาว" sticks.
8. Toggle light/dark mode and confirm the form, combobox, select, and error text all render legibly in both.

Expected: All eight checks pass with no unexpected console errors (only the intentional `console.log(values)` from check 4).

- [ ] **Step 5: Commit**

```bash
git add "app/(public)/profiles/vendor-info/page.tsx"
git commit -m "feat(vendor): wire vendor info forms into vendor-info page"
```

---

## Self-Review Notes

- **Spec coverage:** Design spec Part 1 (schemas) → Task 1. Part 2 (hooks) → Task 3. Part 3 (`CompanyInfoForm`) → Task 4. Part 4 (`IndividualInfoForm`) → Task 5. Part 5 (`formatThaiId`) → Task 2. Part 6 (`page.tsx`) → Task 6 Step 1. Spec's "Error Handling" section (warning dot + zod error coexisting) → Global Constraints bullet + Task 6 Step 4 checks 2-3. Spec's "Testing" section (no runner, manual verification checklist) → Task 6 Step 4, consistent with Tasks 1-5's typecheck/lint-only verification.
- **Placeholder scan:** No TBD/TODO; every code block is complete and copy-pasteable; the `console.log(values)` in Task 3 is an explicit, spec-documented placeholder for the future backend mutation, not an unfinished step.
- **Type consistency:** `VendorCompanyInfoSchema`/`VendorCompanyInfoValues` and `VendorIndividualInfoSchema`/`VendorIndividualInfoValues` field names (Task 1) match `useVendorCompanyInfoForm`/`useVendorIndividualInfoForm`'s `defaultValues` keys (Task 3), which match every `register("...")`/`Controller name="..."` call and `errors.____?.message` access in both components (Tasks 4-5). `useVendorCompanyInfoForm(detail: VendorCompanyInfoValues)` and `useVendorIndividualInfoForm(detail: VendorIndividualInfoValues)` signatures (Task 3) match their call sites in Tasks 4-5 (`useVendorCompanyInfoForm(detail)` / `useVendorIndividualInfoForm(detail)` where `detail` is the component's own `{ detail }` prop). `CompanyInfoForm`/`IndividualInfoForm`'s `{ detail }` prop types (Tasks 4-5) match how Task 6 calls them (`<CompanyInfoForm detail={vendor.detail} />` / `<IndividualInfoForm detail={vendor.detail} />` after the `vendor.detail.type` narrowing check). `formatThaiId(value: string): string` (Task 2) matches its usage inside `handleThaiIdChange` in both Task 4 and Task 5.
