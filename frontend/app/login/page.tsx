"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { routes } from "@/lib/routes";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ReactNode, useState } from "react";

const InputField = ({ label, children }: { label: string; children: ReactNode; }) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex gap-1">
            <p className="font-medium tracking-wider">{label}</p>
            <span className="text-red-600">*</span>
        </div>

        {children}
    </div>
)

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex justify-center items-center bg-background min-h-dvh p-8">
            <Card className="max-w-103 w-full py-6 px-5">
                <CardHeader className="flex flex-col items-center justify-center gap-0">

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

                <CardContent className="flex flex-col gap-4">
                    <InputField label="อีเมล / ชื่อผู้ใช้">
                        <Input
                            className="py-0 px-3 h-11"
                        />
                    </InputField>

                    <InputField label="รหัสผ่าน">

                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
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

                    <div className="flex justify-between">
                        <div className="flex items-center gap-2">
                            <FieldGroup className="mx-auto w-56">
                                <Field orientation="horizontal">

                                    <Checkbox
                                        id="terms-checkbox-basic"
                                        name="terms-checkbox-basic"
                                        className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
                                    />

                                    <FieldLabel htmlFor="terms-checkbox-basic" className="font-light tracking-wide text-sm cursor-pointer">
                                        จดจำฉัน
                                    </FieldLabel>
                                </Field>
                            </FieldGroup>
                        </div>

                        <Link
                            href={""}
                            className="text-red-700 font-semibold tracking-wide"
                        >
                            ลืมรหัสผ่าน?
                        </Link>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col bg-white border-none pb-6 pt-0">
                    <Button className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600">
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
            </Card>
        </div>
    )
}
