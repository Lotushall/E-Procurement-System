"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputField } from "@/components/input-field";
import SectionTitle from "./section-title";
import { useAccountInfoForm } from "../_hooks/use-account-info-form";

export default function AccountInfoSection() {
  const { register, onSubmit, formState: { errors }, isSubmitting, isEmailVerified } = useAccountInfoForm();

  return (
    <div className="flex flex-col">
      <SectionTitle title="ข้อมูลบัญชี" desc="ชื่อผู้ใช้และอีเมลสำหรับเข้าสู่ระบบ" />

      <form onSubmit={onSubmit} noValidate className="flex flex-col">
        <div className="grid md:grid-cols-2 gap-4">
          <InputField label="ชื่อผู้ใช้" error={errors.username?.message}>
            <Input {...register("username")} aria-invalid={!!errors.username} className="h-11 rounded-sm" />
          </InputField>

          <InputField
            label="อีเมล"
            error={errors.email?.message}
            badge={!isEmailVerified && (
              <Badge className="tracking-wider text-yellow-600 bg-yellow-400/15">
                ยังไม่ยืนยัน
              </Badge>
            )}
          >
            <Input {...register("email")} type="email" aria-invalid={!!errors.email} className="h-11 rounded-sm" />
          </InputField>
        </div>

        <div className="flex justify-end mt-5">
          <Button type="submit" disabled={isSubmitting} className="text-white bg-red-700 md:w-28 h-11 hover:bg-red-600">
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </Button>
        </div>
      </form>
    </div>
  );
}
