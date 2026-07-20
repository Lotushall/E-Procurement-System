"use client";

import { useId } from "react";
import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputField } from "../../_components/input-field";
import type { AddContactValues } from "../_schemas/schema";

export function ContactFormFields({
  register,
  control,
  errors,
}: {
  register: UseFormRegister<AddContactValues>;
  control: Control<AddContactValues>;
  errors: FieldErrors<AddContactValues>;
}) {
  const isMainContactId = useId();

  return (
    <>
      <div className="grid md:grid-cols-2 gap-4">
        <InputField label="ชื่อผู้ติดต่อ" error={errors.contactName?.message}>
          <Input {...register("contactName")} aria-invalid={!!errors.contactName} className="h-11 rounded-sm" />
        </InputField>

        <InputField label="ตำแหน่ง" error={errors.contactPosition?.message}>
          <Input {...register("contactPosition")} className="h-11 rounded-sm" />
        </InputField>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField label="เบอร์โทร" error={errors.contactPhone?.message}>
          <Input {...register("contactPhone")} inputMode="numeric" aria-invalid={!!errors.contactPhone} className="h-11 rounded-sm" />
        </InputField>
        <InputField label="อีเมล" error={errors.contactEmail?.message}>
          <Input {...register("contactEmail")} type="email" aria-invalid={!!errors.contactEmail} className="h-11 rounded-sm" />
        </InputField>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InputField label="LINE ID" error={errors.lineId?.message}>
          <Input {...register("lineId")} className="h-11 rounded-sm" />
        </InputField>
        <InputField label="ช่องทางติดต่ออื่น ๆ" error={errors.otherContact?.message}>
          <Input {...register("otherContact")} className="h-11 rounded-sm" />
        </InputField>
      </div>

      <Controller
        control={control}
        name="isMainContact"
        render={({ field: { value, onChange, ...field } }) => (
          <Field orientation="horizontal" className="w-fit">
            <Checkbox
              id={isMainContactId}
              checked={value}
              onCheckedChange={onChange}
              className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
              {...field}
            />
            <FieldLabel htmlFor={isMainContactId} className="font-light tracking-wide text-sm cursor-pointer">
              เป็นผู้ติดต่อหลัก
            </FieldLabel>
          </Field>
        )}
      />
    </>
  );
}
