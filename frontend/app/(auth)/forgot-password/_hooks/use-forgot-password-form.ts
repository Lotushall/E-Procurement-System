import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useForgotPassword } from "@/lib/auth/mutations/useForgotPassword";
import { ForgotPasswordSchema, ForgotPasswordValues } from "../_schemas/schema";

const RESEND_COOLDOWN_SECONDS = 60;

export function useForgotPasswordForm() {
    const forgotPasswordMutation = useForgotPassword();
    const [sentTo, setSentTo] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(
            () => setResendCooldown((seconds) => seconds - 1),
            1000,
        );
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const form = useForm<ForgotPasswordValues>({
        resolver: zodResolver(ForgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const getErrorMessage = (error: unknown) => {
        const fieldErrors = isAxiosError(error) && error.response?.status === 422
            ? (error.response.data as { errors?: Record<string, string[]> }).errors
            : undefined;

        const message = fieldErrors
            ? Object.values(fieldErrors)[0]?.[0]
            : isAxiosError(error)
                ? (error.response?.data as { message?: string } | undefined)?.message
                : undefined;

        return message ?? "ส่งลิงก์ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    };

    const onSubmit = form.handleSubmit((values) => {
        forgotPasswordMutation.mutate(values.email, {
            onSuccess: () => {
                setSentTo(values.email);
                setResendCooldown(RESEND_COOLDOWN_SECONDS);
            },
            onError: (error) => toast.error(getErrorMessage(error)),
        });
    });

    const onResend = () => {
        if (!sentTo || resendCooldown > 0) return;

        toast.promise(forgotPasswordMutation.mutateAsync(sentTo), {
            loading: "กำลังส่งอีเมล...",
            success: () => {
                setResendCooldown(RESEND_COOLDOWN_SECONDS);
                return "ส่งลิงก์ตั้งรหัสผ่านใหม่อีกครั้งแล้ว กรุณาตรวจสอบกล่องจดหมาย";
            },
            error: getErrorMessage,
        });
    };

    return {
        ...form,
        onSubmit,
        isSubmitting: forgotPasswordMutation.isPending,
        sentTo,
        onResend,
        isResending: forgotPasswordMutation.isPending,
        resendCooldown,
    };
}
