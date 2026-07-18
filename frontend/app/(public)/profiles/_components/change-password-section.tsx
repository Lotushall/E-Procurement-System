"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { InputField } from "./input-field";
import SectionTitle from "./section-title";
import { useChangePasswordForm } from "../_hooks/use-change-password-form";

export default function ChangePasswordSection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, onSubmit, formState: { errors } } = useChangePasswordForm();

  return (
    <div className="flex flex-col mt-3 md:mt-0">
      <SectionTitle title="เปลี่ยนรหัสผ่าน" desc="ตั้งรหัสผ่านใหม่สำหรับเข้าสู่ระบบ" />

      <form onSubmit={onSubmit} noValidate className="flex flex-col">
        <div className="grid md:grid-cols-2 gap-4">
          <InputField label="รหัสผ่านปัจจุบัน" cols={2} error={errors.currentPassword?.message}>
            <div className="relative">
              <Input
                {...register("currentPassword")}
                type={showCurrent ? "text" : "password"}
                aria-invalid={!!errors.currentPassword}
                className="h-11 rounded-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground cursor-pointer"
                aria-label={showCurrent ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </InputField>

          <InputField label="รหัสผ่านใหม่" error={errors.password?.message}>
            <div className="relative">
              <Input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                aria-invalid={!!errors.password}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="h-11 rounded-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground cursor-pointer"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </InputField>

          <InputField label="ยืนยันรหัสผ่านใหม่" error={errors.confirmPassword?.message}>
            <div className="relative">
              <Input
                {...register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                aria-invalid={!!errors.confirmPassword}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                className="h-11 rounded-sm pr-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground cursor-pointer"
                aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </InputField>
        </div>

        <div className="flex justify-end mt-5">
          <Button type="submit" className="text-white bg-red-700 md:w-40 h-11 hover:bg-red-600">
            เปลี่ยนรหัสผ่าน
          </Button>
        </div>
      </form>
    </div>
  );
}
