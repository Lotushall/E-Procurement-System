import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useResetPassword } from "@/lib/auth/mutations/useResetPassword";
import { ResetPasswordSchema, ResetPasswordValues } from "../_schemas/schema";

export type ResetPasswordStatus = "invalid" | "form" | "success";

export function useResetPasswordForm() {
    const searchParams = useSearchParams();
    const resetPasswordMutation = useResetPassword();

    const params = useMemo(() => {
        const email = searchParams.get("email");
        const token = searchParams.get("token");

        if (!email || !token) return null;

        return { email, token };
    }, [searchParams]);

    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(ResetPasswordSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    const onSubmit = form.handleSubmit((values) => {
        if (!params) return;

        resetPasswordMutation.mutate(
            {
                email: params.email,
                token: params.token,
                password: values.password,
                password_confirmation: values.confirmPassword,
            },
            {
                onError: (error) => {
                    const fieldErrors = isAxiosError(error) && error.response?.status === 422
                        ? (error.response.data as { errors?: Record<string, string[]> }).errors
                        : undefined;

                    const message = fieldErrors
                        ? Object.values(fieldErrors)[0]?.[0]
                        : isAxiosError(error)
                            ? (error.response?.data as { message?: string } | undefined)?.message
                            : undefined;

                    toast.error(message ?? "ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                },
            },
        );
    });

    const status: ResetPasswordStatus = !params
        ? "invalid"
        : resetPasswordMutation.isSuccess
            ? "success"
            : "form";

    return {
        ...form,
        onSubmit,
        isSubmitting: resetPasswordMutation.isPending,
        status,
    };
}
