# Vendor Info Form Schema + Hook (Vendor-Info Page)

## Context

`app/(public)/profiles/vendor-info/page.tsx` renders the "ข้อมูลบริษัท / นิติบุคคล" form (company or individual variant, picked from `vendor.detail.type`). Today every field is an uncontrolled `<Input defaultValue={...}>` / uncontrolled `<Combobox defaultValue={...}>` / `<Select defaultValue={...}>` — there is no `react-hook-form`, no validation, and the submit button does nothing.

The rest of the profiles module already has an established convention (`app/(public)/profiles/_hooks/use-account-info-form.ts`, `app/(public)/profiles/contract/_hooks/use-add-contact-form.ts`): a route-scoped `_schemas/schema.ts` (zod object + inferred type) paired with a `_hooks/use-<name>-form.ts` (wraps `useForm` with `zodResolver`, exposes `register`/`control`/`formState`/`onSubmit`). This task extends that convention to the vendor-info page.

The backend update endpoint is a stub: `UpdateVendorInfoRequest::rules()` returns `[]`, `VendorController::updateVendorInfo()` has an empty body, and no route is registered for it (`routes/api/v1/vendor.php` only has `GET profile`). Per user decision, `onSubmit` validates client-side and `console.log`s the values for now — same placeholder pattern already used by `useAddContactForm` — rather than wiring a network call that would 404.

`vendor.detail` is a discriminated union (`lib/vendor/types.ts:5-33`) between `VendorCompanyProfileDetail` and `VendorIndividualProfileDetail`. Because the two variants render completely different field sets and React hooks can't be called conditionally, this task uses **two separate hooks** (`useVendorCompanyInfoForm`, `useVendorIndividualInfoForm`) and **two separate components** rather than one hook driving a union schema — mirroring the `if (vendor.detail.type === "company") { ... } else { ... }` branch that already exists in the page.

Only fields actually rendered in the current form are included. `VendorIndividualProfileDetail.email`/`.phone` and `VendorCompanyProfileDetail.country` exist on the type but are never rendered on this page, so they're left out of the schema (YAGNI — matches the `AddContactSchema` precedent of leaving out fields the current UI doesn't use).

Required vs. optional fields mirror the `warning={!vendor.detail.x}` dots already present in the current JSX (`vendor-info/page.tsx:54-273`), which flag which fields the business already treats as required-but-possibly-missing:

- **Company**: required — `companyName`, `businessType`, `businessRegistrationNo`, `taxId`, `address`, `province`, `postalCode`. Optional — `branchNo`.
- **Individual**: required — `storeName`, `businessType`, `firstname`, `lastname`, `citizenId`, `address`, `province`, `postalCode`. Optional — `prefix`, `taxId`.

## Part 1: `app/(public)/profiles/_schemas/schema.ts` (append)

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

Appended to the existing file (which already has `AccountInfoSchema` / `ChangePasswordSchema`) — same file, same `z` import, no new module.

## Part 2: `app/(public)/profiles/vendor-info/_hooks/use-vendor-info-form.ts` (new)

```ts
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

`values: detail` (rather than only `defaultValues`) mirrors `useAccountInfoForm`'s `values: user ? {...} : undefined` — it keeps the form in sync if the underlying query data changes/refetches. Since the calling component only mounts once `vendor` has loaded (see Part 6), `detail` is always defined here, unlike the account-info case.

No mutation, no network call — same placeholder shape as `useAddContactForm`. This is the piece that changes once the backend endpoint is real (swap `console.log` for a `useMutation` call, add an `isSubmitting` flag, same as `useAccountInfoForm`/`useChangePasswordForm`).

## Part 3: `app/(public)/profiles/vendor-info/_components/company-info-form.tsx` (new)

Renders the company field set, wired to `useVendorCompanyInfoForm`. `businessTypeQuery`/`canAddBusinessType` local state moves in from the current page component unchanged. The `Combobox` switches from `defaultValue` to a controlled `Controller` (`value`/`onValueChange`, matching the Base UI `Combobox.Root` controlled API — the same family as the `Checkbox` `checked`/`onCheckedChange` `Controller` already used in `contact-form-fields.tsx`).

```tsx
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

`formatThaiId` moves out of `page.tsx` into a shared `vendor-info/_lib/format-thai-id.ts` (plain function, no JSX) since both `CompanyInfoForm` and `IndividualInfoForm` need it identically — extracting avoids duplicating the same function body in two files.

## Part 4: `app/(public)/profiles/vendor-info/_components/individual-info-form.tsx` (new)

Same shape as Part 3 but for the individual field set, using `useVendorIndividualInfoForm`. The `prefix` `<Select>` becomes a `Controller` with `value`/`onValueChange` (same controlled API family as `Combobox.Root`).

```tsx
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

`prefix`'s `value={value || "นาย"}` preserves the current page's fallback behavior (`defaultValue={vendor.detail.prefix || "นาย"}`) for vendors with no prefix saved yet.

## Part 5: `app/(public)/profiles/vendor-info/_lib/format-thai-id.ts` (new)

```ts
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

Moved verbatim from the current `page.tsx:16-30` (the standalone `handleThaiIdChange` wrapper is dropped — Part 3/4 inline the equivalent via `handleThaiIdChange(field.onChange)` since the value now flows through `Controller` instead of an uncontrolled `onChange` prop).

## Part 6: `app/(public)/profiles/vendor-info/page.tsx` (rewrite)

```tsx
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

`vendor.detail` narrows to `VendorCompanyProfileDetail`/`VendorIndividualProfileDetail` from the `type` discriminant check, which structurally satisfies `VendorCompanyInfoValues`/`VendorIndividualInfoValues` (same field names/types minus the `type` tag itself, which the form schemas don't need).

## Error Handling

Purely client-side, zod-driven field errors shown through `InputField`'s existing `error` slot — same mechanism `account-info-section.tsx` and `add-contact-dialog.tsx` already use. The pre-existing `warning` dot is kept as-is (still reflects the vendor's currently-saved data being empty, independent of live form/validation state) so both signals coexist: `warning` = "this was missing when the page loaded", `error` = "this fails validation right now". No network errors to handle since there is no request yet (see Context).

## Testing

No test runner is configured in this repo (consistent with prior frontend specs — see `2026-07-17-vendor-contact-add-dialog-design.md`). Verification is manual, for both company and individual vendor accounts:
- Load the page, confirm existing values populate every field (including the `Combobox`/`Select` controls) same as before.
- Clear a required field and submit — confirm its `error` message appears and submit is blocked.
- Confirm the `warning` dot still shows for originally-empty fields regardless of what's typed.
- Fill all required fields and submit — confirm no errors, and the payload is logged to the console (`console.log`, placeholder for the future mutation).
- Type in the Thai-ID-formatted fields (`เลขทะเบียนนิติบุคคล`, `เลขผู้เสียภาษี`, `เลขบัตรประชาชน`) and confirm the `X-XXXX-XXXXX-XX-X` formatting still applies live.
- Type a new business type into the combobox and confirm the "+ เพิ่ม" add-option still appears and is selectable.
- Check both light and dark mode.
