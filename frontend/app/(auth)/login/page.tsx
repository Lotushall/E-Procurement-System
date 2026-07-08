"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
    identifier: z.string().min(1, "กรุณากรอกอีเมลหรือชื่อผู้ใช้"),
    password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
    remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

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

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            identifier: "",
            password: "",
            remember: false,
        },
    });

    const onSubmit = (values: LoginValues) => {
        console.log(values);
    };

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

                <CardTitle className="text-xl font-bold">เข้าสู่ระบบ</CardTitle>
                <CardDescription className="text-sm tracking-wide">กรุณาลงชื่อเข้าใช้เพื่อดำเนินการต่อ</CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CardContent className="flex flex-col gap-4 animate-in duration-200">
                    <InputField label="อีเมล / ชื่อผู้ใช้" error={errors.identifier?.message}>
                        <Input
                            {...register("identifier")}
                            aria-invalid={!!errors.identifier}
                            placeholder="name@company.co.th / username"
                            className="py-0 px-3 h-11"
                        />
                    </InputField>

                    <InputField label="รหัสผ่าน" error={errors.password?.message}>

                        <div className="relative">
                            <Input
                                {...register("password")}
                                type={showPassword ? "text" : "password"}
                                aria-invalid={!!errors.password}
                                placeholder="••••••••"
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

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
                        <Field orientation="horizontal" className="w-fit">
                            <Controller
                                control={control}
                                name="remember"
                                render={({ field: { value, onChange, ...field } }) => (
                                    <Checkbox
                                        id="remember-checkbox"
                                        checked={value}
                                        onCheckedChange={onChange}
                                        className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
                                        {...field}
                                    />
                                )}
                            />

                            <FieldLabel htmlFor="remember-checkbox" className="font-light tracking-wide text-sm cursor-pointer">
                                จดจำฉัน
                            </FieldLabel>
                        </Field>

                        <Link
                            href={routes.forgotpassword}
                            className="text-red-700 font-semibold tracking-wide"
                        >
                            ลืมรหัสผ่าน?
                        </Link>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col bg-white border-none pb-6 pt-0 animate-in duration-200">
                    <Button type="submit" className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600">
                        เข้าสู่ระบบ
                    </Button>

                    <div className="flex gap-1 text-sm tracking-wider mt-4.5">
                        <p className="font-light">ยังไม่มีบัญชี?</p>
                        <Link
                            href={routes.register}
                            className="font-bold text-red-700"
                        >
                            ลงทะเบียนที่นี่
                        </Link>
                    </div>
                </CardFooter>
            </form>
        </>
    )
}
