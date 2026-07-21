import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { VerifyEmailView } from "./_components/verify-email-view";

function VerifyEmailFallback() {
    return (
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
            <Loader2 className="mb-2 size-8 animate-spin text-red-700" />
            <CardTitle className="text-xl font-bold">กำลังยืนยันอีเมล</CardTitle>
            <CardDescription className="text-sm tracking-wide text-center">กรุณารอสักครู่...</CardDescription>
        </CardHeader>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<VerifyEmailFallback />}>
            <VerifyEmailView />
        </Suspense>
    );
}
