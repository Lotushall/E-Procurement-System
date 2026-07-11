"use client";

import { Button } from "@/components/ui/button";
import { CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { CircleCheck, Loader2, OctagonX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useVerifyEmailPage } from "../_hooks/use-verify-email-page";

export function VerifyEmailView() {
    const { status } = useVerifyEmailPage();

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

                {status === "verifying" && (
                    <>
                        <Loader2 className="mb-2 size-8 animate-spin text-red-700" />
                        <CardTitle className="text-xl font-bold">กำลังยืนยันอีเมล</CardTitle>
                        <CardDescription className="text-sm tracking-wide text-center">
                            กรุณารอสักครู่...
                        </CardDescription>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CircleCheck className="mb-2 size-8 text-emerald-600" />
                        <CardTitle className="text-xl font-bold">ยืนยันอีเมลสำเร็จ</CardTitle>
                        <CardDescription className="text-sm tracking-wide text-center">
                            บัญชีของคุณพร้อมใช้งานแล้ว กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ
                        </CardDescription>
                    </>
                )}

                {(status === "error" || status === "invalid") && (
                    <>
                        <OctagonX className="mb-2 size-8 text-destructive" />
                        <CardTitle className="text-xl font-bold">ยืนยันอีเมลไม่สำเร็จ</CardTitle>
                        <CardDescription className="text-sm tracking-wide text-center">
                            ลิงก์ยืนยันอีเมลไม่ถูกต้องหรือหมดอายุ กรุณาลงทะเบียนใหม่หรือติดต่อเจ้าหน้าที่
                        </CardDescription>
                    </>
                )}
            </CardHeader>

            {(status === "error" || status === "invalid") && (
                <CardFooter className="flex flex-col bg-white border-none pb-6 pt-4">
                    <Link href={routes.login} className="w-full">
                        <Button className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600">
                            ไปหน้าเข้าสู่ระบบ
                        </Button>
                    </Link>
                </CardFooter>
            )}
        </>
    );
}
