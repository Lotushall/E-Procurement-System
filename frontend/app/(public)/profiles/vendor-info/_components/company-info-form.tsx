"use client";

import { Controller } from "react-hook-form";
import { InputField } from "../../_components/input-field";
import { PROVINCES } from "../../data/provinces";
import { Input } from "@/components/ui/input";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { ChangeEvent } from "react";
import { formatThaiId } from "../_lib/format-thai-id";
import { useVendorCompanyInfoForm } from "../_hooks/use-vendor-info-form";
import type { VendorCompanyInfoValues } from "../_schemas/schema";
import { BusinessTypeCombobox } from "./business-type-combobox";

export default function CompanyInfoForm({ detail }: { detail: VendorCompanyInfoValues }) {
  const { register, control, onSubmit, reset, formState: { errors }, isSubmitting } = useVendorCompanyInfoForm(detail);

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
              <BusinessTypeCombobox value={value} onValueChange={onChange} {...field} />
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
                value={formatThaiId(value ?? "")}
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
                value={formatThaiId(value ?? "")}
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
          <Controller
            control={control}
            name="province"
            render={({ field: { value, onChange, ...field } }) => (
              <Combobox items={PROVINCES} value={value} onValueChange={onChange} {...field}>
                <ComboboxTrigger
                  render={
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal text-black data-popup-open:border-gray-700 hover:bg-transparent data-placeholder:text-gray-400"
                    >
                      <span className="min-w-0 truncate">
                        <ComboboxValue placeholder="เลือกจังหวัด" />
                      </span>
                      <ChevronDown />
                    </Button>
                  }
                  className="h-11 rounded-sm bg-transparent"
                />
                <ComboboxContent>
                  <ComboboxInput
                    showTrigger={false}
                    placeholder="ค้นหาจังหวัด"
                    className="
                    bg-transparent! border-0 border-b! border-gray-300! rounded-none ring-0 shadow-none focus-visible:outline-none focus-visible:ring-0
                    has-[[data-slot=input-group-control]:focus-visible]:border-transparent
                    has-[[data-slot=input-group-control]:focus-visible]:ring-0
                    "
                  />
                  <ComboboxEmpty>ไม่พบจังหวัดที่ค้นหา</ComboboxEmpty>
                  <ComboboxList>
                    {(item: string) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
        </InputField>

        <InputField label="รหัสไปรษณีย์" cols={2} warning={!detail.postalCode} error={errors.postalCode?.message}>
          <Input {...register("postalCode")} aria-invalid={!!errors.postalCode} className="h-11 rounded-sm" />
        </InputField>
      </div>

      <div className="flex justify-end gap-3 mt-5">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          className="w-28 h-11"
          onClick={() => reset()}
        >
          รีเช็ต
        </Button>
        <Button
          disabled={isSubmitting || Object.keys(errors).length > 0}
          type="submit"
          className="text-white bg-red-700 w-28 h-11 hover:bg-red-600"
        >
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </Button>
      </div>
    </form>
  );
}
