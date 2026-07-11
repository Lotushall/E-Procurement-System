"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useVerifyEmail } from "@/lib/auth/mutations";
import { routes } from "@/lib/routes";

export type VerifyEmailStatus = "invalid" | "verifying" | "success" | "error";

const SUCCESS_REDIRECT_DELAY_MS = 1500;

export function useVerifyEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const verifyEmail = useVerifyEmail();
    const { mutate } = verifyEmail;

    const params = useMemo(() => {
        const id = searchParams.get("id");
        const hash = searchParams.get("hash");
        const expires = searchParams.get("expires");
        const signature = searchParams.get("signature");

        if (!id || !hash || !expires || !signature) return null;

        return { id, hash, expires, signature };
    }, [searchParams]);

    useEffect(() => {
        if (params) mutate(params);
    }, [params, mutate]);

    const status: VerifyEmailStatus = !params
        ? "invalid"
        : verifyEmail.isSuccess
            ? "success"
            : verifyEmail.isError
                ? "error"
                : "verifying";

    useEffect(() => {
        if (status !== "success") return;

        const timer = setTimeout(() => router.replace(routes.login), SUCCESS_REDIRECT_DELAY_MS);
        return () => clearTimeout(timer);
    }, [status, router]);

    return { status };
}
