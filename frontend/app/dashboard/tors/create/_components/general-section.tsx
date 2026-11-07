"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import { DepartmentSelect } from "@/components/department-select";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { useTenderProjectOptions } from "@/lib/tender/tender-projects/queries/useTenderProjectOptions";
import type { CreateTorFormValues } from "../_hooks/use-create-tor-form";
import { FormSection } from "./form-section";
import { TenderProjectSelect } from "./tender-project-select";

export function GeneralSection() {
    const { register, control, setValue, formState: { errors } } = useFormContext<CreateTorFormValues>();
    const departmentId = useWatch({ control, name: "departmentId" });

    const { data: departmentOptions } = useDepartmentOptions();
    // backend คืนเฉพาะโครงการของหน่วยงานนี้ที่ยังรับ TOR ได้ — ต้องเลือกหน่วยงานก่อน
    const { data: projectOptions } = useTenderProjectOptions(
        { department_id: Number(departmentId), open_for_tor: true },
        { enabled: !!departmentId },
    );

    return (
        <FormSection step={1} title="ข้อมูลทั่วไป">
            <InputField label="ชื่อ TOR" required error={errors.title?.message}>
                <Input
                    {...register("title")}
                    placeholder="เช่น จ้างพัฒนาระบบบริหารงานพัสดุ"
                    aria-invalid={!!errors.title}
                    className="h-10 rounded-sm"
                />
            </InputField>

            <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                    control={control}
                    name="departmentId"
                    render={({ field: { value, onChange } }) => (
                        <InputField label="หน่วยงาน" required error={errors.departmentId?.message}>
                            <DepartmentSelect
                                departments={departmentOptions ?? []}
                                value={value}
                                onValueChange={(next) => {
                                    onChange(next);
                                    // โครงการเดิมเป็นของหน่วยงานเก่า — ล้างทิ้งไม่ให้ส่งคู่ที่ backend ปฏิเสธ
                                    setValue("tenderProjectId", "");
                                }}
                                placeholder="เลือกหน่วยงาน"
                                ariaInvalid={!!errors.departmentId}
                            />
                        </InputField>
                    )}
                />

                <Controller
                    control={control}
                    name="tenderProjectId"
                    render={({ field: { value, onChange } }) => (
                        <InputField
                            label="โครงการ"
                            badge={<span className="text-sm text-gray-500">(ไม่บังคับ)</span>}
                            error={errors.tenderProjectId?.message}
                        >
                            <TenderProjectSelect
                                projects={projectOptions ?? []}
                                value={value ?? ""}
                                onValueChange={onChange}
                                disabled={!departmentId}
                                ariaInvalid={!!errors.tenderProjectId}
                            />
                            <p className="text-xs text-gray-500">
                                {departmentId
                                    ? "แสดงเฉพาะโครงการของหน่วยงานนี้ที่ยังรับ TOR ได้"
                                    : "เลือกหน่วยงานก่อน จึงจะเลือกโครงการได้"}
                            </p>
                        </InputField>
                    )}
                />
            </div>
        </FormSection>
    );
}
