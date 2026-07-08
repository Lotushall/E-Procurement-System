"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const forgotPasswordSchema = z.object({
    email: z.email("กรุณากรอกอีเมลให้ถูกต้อง"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const InputField = ({ label, error, children }: { label: string; error?: string; children: ReactNode; }) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex gap-1">
            <p className="font-medium tracking-wider">{label}</p>
            <span className="text-red-600">*</span>
        </div>

        {children}

        {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
)

export default function ForgotPassword() {
    const [sentTo, setSentTo] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = (values: ForgotPasswordValues) => {
        setSentTo(values.email);
    };

    if (sentTo) {
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

                    <CardTitle className="text-xl font-bold">ตรวจสอบอีเมลของคุณ</CardTitle>
                    <CardDescription className="text-sm tracking-wide text-center">
                        หากอีเมล <span className="font-semibold text-foreground">{sentTo}</span> มีอยู่ในระบบ
                        เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว
                    </CardDescription>
                </CardHeader>

                <CardFooter className="flex flex-col bg-white border-none pb-6 pt-4">
                    <Link href={routes.login} className="w-full">
                        <Button className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600">
                            กลับไปเข้าสู่ระบบ
                        </Button>
                    </Link>

                    <button
                        type="button"
                        onClick={() => setSentTo(null)}
                        className="mt-4.5 text-sm font-semibold text-red-700 tracking-wide cursor-pointer"
                    >
                        ไม่ได้รับอีเมล? ลองอีกครั้ง
                    </button>
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

                <CardTitle className="text-xl font-bold">ลืมรหัสผ่าน</CardTitle>
                <CardDescription className="text-sm tracking-wide text-center">
                    กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CardContent className="flex flex-col gap-4 animate-in duration-200">
                    <InputField label="อีเมล" error={errors.email?.message}>
                        <Input
                            {...register("email")}
                            type="email"
                            aria-invalid={!!errors.email}
                            placeholder="name@company.co.th"
                            className="py-0 px-3 h-11"
                        />
                    </InputField>
                </CardContent>

                <CardFooter className="flex flex-col bg-white border-none pb-6 pt-4">
                    <Button type="submit" className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600">
                        ส่งลิงก์รีเซ็ตรหัสผ่าน
                    </Button>

                    <div className="flex gap-1 text-sm tracking-wider mt-4.5">
                        <p className="font-light">นึกรหัสผ่านได้แล้ว?</p>
                        <Link href={routes.login} className="font-bold text-red-700">
                            เข้าสู่ระบบ
                        </Link>
                    </div>
                </CardFooter>
            </form>
        </>
    );
}
