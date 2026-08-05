"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";
import { CircleCheck, Eye, EyeOff, OctagonX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { InputField } from "../../_components/input-field";
import { useResetPasswordForm } from "../_hooks/use-reset-password-form";

export function ResetPasswordView() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const {
        register,
        formState: { errors },
        onSubmit,
        isSubmitting,
        status,
    } = useResetPasswordForm();

    if (status === "invalid") {
        return (
            <>
                <CardHeader className="flex flex-col items-center justify-center gap-0 animate-in duration-200">
                    <div className="mb-3">
                        <Image
                            src="/images/icon/lotushall_logo.png"
                            alt="Lotushall Logo"
                            width={80}
                            height={80}
                            priority
                        />
                    </div>

                    <OctagonX className="mb-2 size-8 text-destructive" />
                    <CardTitle className="text-xl font-bold">ลิงก์ไม่ถูกต้อง</CardTitle>
                    <CardDescription className="text-sm tracking-wide text-center">
                        ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่อีกครั้ง
                    </CardDescription>
                </CardHeader>

                <CardFooter className="flex flex-col bg-white border-none pb-6 pt-4">
                    <Link href={routes.auth.forgotpassword} className="w-full">
                        <Button className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600">
                            ขอลิงก์ใหม่
                        </Button>
                    </Link>
                </CardFooter>
            </>
        );
    }

    if (status === "success") {
        return (
            <>
                <CardHeader className="flex flex-col items-center justify-center gap-0 animate-in duration-200">
                    <div className="mb-3">
                        <Image
                            src="/images/icon/lotushall_logo.png"
                            alt="Lotushall Logo"
                            width={80}
                            height={80}
                            priority
                        />
                    </div>

                    <CircleCheck className="mb-2 size-8 text-emerald-600" />
                    <CardTitle className="text-xl font-bold">ตั้งรหัสผ่านใหม่สำเร็จ</CardTitle>
                    <CardDescription className="text-sm tracking-wide text-center">
                        กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่ของคุณ
                    </CardDescription>
                </CardHeader>

                <CardFooter className="flex flex-col bg-white border-none pb-6 pt-4">
                    <Link href={routes.auth.login} className="w-full">
                        <Button className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600">
                            ไปหน้าเข้าสู่ระบบ
                        </Button>
                    </Link>
                </CardFooter>
            </>
        );
    }

    return (
        <>
            <CardHeader className="flex flex-col items-center justify-center gap-0 animate-in duration-200">
                <div className="mb-3">
                    <Image
                        src="/images/icon/lotushall_logo.png"
                        alt="Lotushall Logo"
                        width={80}
                        height={80}
                        priority
                    />
                </div>

                <CardTitle className="text-xl font-bold">ตั้งรหัสผ่านใหม่</CardTitle>
                <CardDescription className="text-sm tracking-wide text-center">
                    กรอกรหัสผ่านใหม่ของคุณ
                </CardDescription>
            </CardHeader>

            <form onSubmit={onSubmit} noValidate>
                <CardContent className="flex flex-col gap-4 animate-in duration-200">
                    <InputField label="รหัสผ่านใหม่" error={errors.password?.message}>
                        <div className="relative">
                            <Input
                                {...register("password")}
                                type={showPassword ? "text" : "password"}
                                aria-invalid={!!errors.password}
                                placeholder="อย่างน้อย 8 ตัวอักษร"
                                className="py-0 px-3 pr-9 h-11"
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
                                className="py-0 px-3 pr-9 h-11"
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
                </CardContent>

                <CardFooter className="flex flex-col bg-white border-none pb-6 pt-4">
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600"
                    >
                        {isSubmitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
                    </Button>
                </CardFooter>
            </form>
        </>
    );
}
