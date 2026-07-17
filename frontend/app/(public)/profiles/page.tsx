"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import { InputField } from "./_components/input-field";
import { BUSINESS_TYPES } from "./data/business-types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const { data: vendor, isLoading } = useVendorProfile();

  return (
    <div className="flex flex-col">
      <div className="mb-5">
        <h4 className="font-bold text-lg">ข้อมูลบริษัท / นิติบุคคล</h4>
        <p className="font-light text-sm text-gray-600 tracking-wider">ข้อมูลนี้จะปรากฏในเอกสารการเสนอราคาและสัญญา</p>
      </div>

      {vendor && !isLoading ? (
        <form noValidate className="flex flex-col">

          <div className="grid grid-cols-4 gap-4">
            {vendor.detail.type === "company" ? (
              <>
                <InputField label="ชื่อบริษัท / นิติบุคคล">
                  <Input defaultValue={vendor.detail.companyName} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="เลขทะเบียนนิติบุคคล">
                  <Input defaultValue={vendor.detail.businessRegistrationNo} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="สาขาที่">
                  <Input defaultValue={vendor.detail.branchNo} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="ประเภทธุรกิจ">
                  <Combobox items={BUSINESS_TYPES} defaultInputValue={vendor.detail.businessType}>
                    <ComboboxInput className="h-11 rounded-sm" />
                    <ComboboxContent>
                      <ComboboxEmpty>ไม่พบตัวเลือกที่ตรงกัน</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </InputField>

                <InputField label="ที่อยู่">
                  <Input defaultValue={vendor.detail.address} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="ประเทศ">
                  <Input defaultValue={vendor.detail.country} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="จังหวัด">
                  <Input defaultValue={vendor.detail.province} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="รหัสไปรษณีย์">
                  <Input defaultValue={vendor.detail.postalCode} className="h-11 rounded-sm" />
                </InputField>
              </>
            ) : (
              <>
                <InputField label="ชื่อร้านค้า" cols={3}>
                  <Input defaultValue={vendor.detail.storeName} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="ประเภทธุรกิจ">
                  <Combobox items={BUSINESS_TYPES} defaultInputValue={vendor.detail.businessType}>
                    <ComboboxInput className="h-11 rounded-sm" />
                    <ComboboxContent>
                      <ComboboxEmpty>ไม่พบตัวเลือกที่ตรงกัน</ComboboxEmpty>
                      <ComboboxList>
                        {(item: string) => (
                          <ComboboxItem key={item} value={item}>
                            {item}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
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

                <InputField label="ชื่อ" >
                  <Input defaultValue={vendor.detail.firstname} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="นามสกุล">
                  <Input defaultValue={vendor.detail.lastname} className="h-11 rounded-sm" />
                </InputField>

                <div />

                <InputField label="ที่อยู่" cols={4}>
                  <Input defaultValue={vendor.detail.address} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="จังหวัด" cols={2}>
                  <Input defaultValue={vendor.detail.province} className="h-11 rounded-sm" />
                </InputField>

                <InputField label="รหัสไปรษณีย์" cols={2}>
                  <Input defaultValue={vendor.detail.postalCode} className="h-11 rounded-sm" />
                </InputField>
              </>
            )}
          </div>

          <div className="flex justify-end mt-5">
            <Button
              type="submit"
              className="text-white bg-red-700 w-28 h-11"
            >
              บันทึกข้อมูล
            </Button>
          </div>
        </form>
      ) : (
        <>loading</>
      )}
    </div>
  )
}
