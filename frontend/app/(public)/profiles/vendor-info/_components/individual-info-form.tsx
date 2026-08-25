"use client";

import { Controller } from "react-hook-form";
import { InputField } from "@/components/input-field";
import { PROVINCES } from "../../data/provinces";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList, ComboboxTrigger, ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { ChangeEvent } from "react";
import { formatThaiId } from "../_lib/format-thai-id";
import { useVendorIndividualInfoForm } from "../_hooks/use-vendor-info-form";
import type { VendorIndividualInfoValues } from "../_schemas/schema";
import { BusinessTypeCombobox } from "./business-type-combobox";

export default function IndividualInfoForm({ detail }: { detail: VendorIndividualInfoValues }) {
  const { register, control, onSubmit, reset, isSubmitting, formState: { errors } } = useVendorIndividualInfoForm(detail);

  function handleThaiIdChange(onChange: (value: string) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => onChange(formatThaiId(e.target.value));
  }

  return (
    <>
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
                <BusinessTypeCombobox value={value} onValueChange={onChange} {...field} />
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
                  value={formatThaiId(value ?? "")}
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
    </>
  );
}
