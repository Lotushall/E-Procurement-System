"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import { InputField } from "../_components/input-field";
import { BUSINESS_TYPES } from "../data/business-types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxSeparator, ComboboxTrigger, ComboboxValue } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import SectionTitle from "../_components/section-title";

export default function VendorInfo() {
  const { data: vendor, isLoading } = useVendorProfile();
  const [businessTypeQuery, setBusinessTypeQuery] = useState("");

  const canAddBusinessType = businessTypeQuery.trim().length > 0 && !BUSINESS_TYPES.some(
    (type) => type.toLowerCase() === businessTypeQuery.trim().toLowerCase()
  );

  return (
    <div className="flex flex-col">
      <SectionTitle title="ข้อมูลบริษัท / นิติบุคคล" desc="ข้อมูลนี้จะปรากฏในเอกสารการเสนอราคาและสัญญา" />

      {vendor && !isLoading ? (
        <form noValidate className="flex flex-col">

          <div className="grid md:grid-cols-4 gap-4 mt-2 md:mt-0">
            {vendor.detail.type === "company" ? (
              <>
                <InputField label="ชื่อบริษัท / นิติบุคคล" cols={3} warning={!vendor.detail.companyName}>
                  <Input defaultValue={vendor.detail.companyName} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="ประเภทธุรกิจ" warning={!vendor.detail.businessType}>
                  <Combobox
                    items={BUSINESS_TYPES}
                    defaultValue={vendor.detail.businessType}
                    onInputValueChange={setBusinessTypeQuery}
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
                </InputField>

                <InputField label="สาขา">
                  <Input defaultValue={vendor.detail.branchNo} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="เลขทะเบียนนิติบุคคล" warning={!vendor.detail.businessRegistrationNo}>
                  <Input
                    defaultValue={formatThaiId(vendor.detail.businessRegistrationNo ?? "")}
                    onChange={handleThaiIdChange}
                    inputMode="numeric"
                    maxLength={17}
                    placeholder="X-XXXX-XXXXX-XX-X"
                    className="h-11 rounded-sm"
                  />
                </InputField>

                <InputField label="เลขผู้เสียภาษี" cols={2} warning={!vendor.detail.taxId}>
                  <Input
                    defaultValue={formatThaiId(vendor.detail.taxId ?? "")}
                    onChange={handleThaiIdChange}
                    inputMode="numeric"
                    maxLength={17}
                    placeholder="X-XXXX-XXXXX-XX-X"
                    className="h-11 rounded-sm"
                  />
                </InputField>

                <div className="hidden md:block" />

                <InputField label="ที่อยู่" cols={4} warning={!vendor.detail.address}>
                  <Input defaultValue={vendor.detail.address} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="จังหวัด" cols={2} warning={!vendor.detail.province}>
                  <Input defaultValue={vendor.detail.province} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="รหัสไปรษณีย์" cols={2} warning={!vendor.detail.postalCode}>
                  <Input defaultValue={vendor.detail.postalCode} className="h-11 rounded-sm" />
                </InputField>
              </>
            ) : (
              <>
                <InputField label="ชื่อร้านค้า" cols={3} warning={!vendor.detail.storeName}>
                  <Input defaultValue={vendor.detail.storeName} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="ประเภทธุรกิจ" warning={!vendor.detail.businessType}>
                  <Combobox
                    items={BUSINESS_TYPES}
                    defaultValue={vendor.detail.businessType}
                    onInputValueChange={setBusinessTypeQuery}
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
                </InputField>

                <InputField label="คำนำหน้า">
                  <Select defaultValue={vendor.detail.prefix || "นาย"}>
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
                </InputField>

                <InputField label="ชื่อ" warning={!vendor.detail.firstname}>
                  <Input defaultValue={vendor.detail.firstname} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="นามสกุล" warning={!vendor.detail.lastname}>
                  <Input defaultValue={vendor.detail.lastname} className="h-11 rounded-sm" />
                </InputField>

                <div className="hidden md:block" />

                <InputField label="เลขบัตรประชาชน" cols={2} warning={!vendor.detail.citizenId}>
                  <Input
                    defaultValue={formatThaiId(vendor.detail.citizenId ?? "")}
                    onChange={handleThaiIdChange}
                    inputMode="numeric"
                    maxLength={17}
                    placeholder="X-XXXX-XXXXX-XX-X"
                    className="h-11 rounded-sm"
                  />
                </InputField>

                <InputField label="เลขผู้เสียภาษี (ถ้ามี)" cols={2}>
                  <Input
                    defaultValue={formatThaiId(vendor.detail.taxId ?? "")}
                    onChange={handleThaiIdChange}
                    inputMode="numeric"
                    maxLength={17}
                    placeholder="X-XXXX-XXXXX-XX-X"
                    className="h-11 rounded-sm"
                  />
                </InputField>

                <div className="hidden md:block" />

                <InputField label="ที่อยู่" cols={4} warning={!vendor.detail.address}>
                  <Input defaultValue={vendor.detail.address} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="จังหวัด" cols={2} warning={!vendor.detail.province}>
                  <Input defaultValue={vendor.detail.province} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="รหัสไปรษณีย์" cols={2} warning={!vendor.detail.postalCode}>
                  <Input defaultValue={vendor.detail.postalCode} className="h-11 rounded-sm" />
                </InputField>
              </>
            )}
          </div>

          <div className="flex justify-end mt-5">
            <Button
              type="submit"
              className="text-white bg-red-700 w-28 h-11 hover:bg-red-600"
            >
              บันทึกข้อมูล
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-center items-center h-70">
          <Spinner className="size-8" />
        </div>
      )}
    </div>
  )
}
