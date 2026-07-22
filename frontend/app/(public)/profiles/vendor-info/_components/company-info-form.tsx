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
import type { VendorCompanyInfoValues } from "../_schemas/schema";

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
