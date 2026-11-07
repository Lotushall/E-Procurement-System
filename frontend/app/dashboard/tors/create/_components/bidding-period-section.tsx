"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import type { CreateTorFormValues } from "../_hooks/use-create-tor-form";
import { FormSection } from "./form-section";

export function BiddingPeriodSection() {
    const { register, formState: { errors } } = useFormContext<CreateTorFormValues>();

    return (
        <FormSection step={3} title="ช่วงรับซอง" description="ไม่บังคับ — กำหนดภายหลังได้ก่อนเผยแพร่">
            <div className="grid gap-4 sm:grid-cols-2">
                <InputField label="เปิดรับซอง" error={errors.biddingStartAt?.message}>
                    <Input
                        type="datetime-local"
                        {...register("biddingStartAt")}
                        aria-invalid={!!errors.biddingStartAt}
                        className="h-10 rounded-sm"
                    />
                </InputField>

                <InputField label="ปิดรับซอง" error={errors.biddingEndAt?.message}>
                    <Input
                        type="datetime-local"
                        {...register("biddingEndAt")}
                        aria-invalid={!!errors.biddingEndAt}
                        className="h-10 rounded-sm"
                    />
                </InputField>
            </div>
        </FormSection>
    );
}
