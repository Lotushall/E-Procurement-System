"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import type { CreateTorFormValues } from "../_hooks/use-create-tor-form";
import { FormSection } from "./form-section";

export function ScopeSection() {
    const { register, control, formState: { errors } } = useFormContext<CreateTorFormValues>();
    const scopeOfWork = useWatch({ control, name: "scopeOfWork" });

    return (
        <FormSection step={4} title="ขอบเขตงาน" required>
            <div className="flex flex-col gap-1.5">
                <p className="text-xs text-gray-500">
                    ระบุรายละเอียดงาน คุณสมบัติ ระยะเวลาส่งมอบ และเงื่อนไขสำคัญ — ขึ้นบรรทัดใหม่ได้ จะแสดงตามรูปแบบที่พิมพ์
                </p>
                <Textarea
                    {...register("scopeOfWork")}
                    placeholder={"1. ขอบเขตงาน\n2. คุณสมบัติผู้เสนอราคา\n3. ระยะเวลาส่งมอบ"}
                    aria-invalid={!!errors.scopeOfWork}
                    className="min-h-44 rounded-sm"
                />
                <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-destructive">{errors.scopeOfWork?.message}</p>
                    <p className="shrink-0 text-xs text-gray-500">
                        {scopeOfWork.length.toLocaleString()} ตัวอักษร
                    </p>
                </div>
            </div>
        </FormSection>
    );
}
