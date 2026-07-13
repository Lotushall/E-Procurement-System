import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useLogin } from "@/lib/auth/mutations";
import { routes } from "@/lib/routes";
import { LoginSchema, LoginValues } from "../_schemas/schema";

export function useLoginForm() {
    const router = useRouter();
    const loginMutation = useLogin();

    const form = useForm<LoginValues>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            identifier: "",
            password: "",
            remember: false,
        },
    });

    const onSubmit = form.handleSubmit((values) => {
        loginMutation.mutate(values, {
            onSuccess: () => router.push(routes.home),
            onError: (error) => {
                if (isAxiosError(error) && error.response?.status === 422) {
                    const fieldErrors = (
                        error.response.data as { errors?: Record<string, string[]> }
                    ).errors;
                    if (fieldErrors) {
                        Object.entries(fieldErrors).forEach(([field, messages]) => {
                            form.setError(field as keyof LoginValues, {
                                type: "server",
                                message: messages[0],
                            });
                        });
                        return;
                    }
                }

                const message = isAxiosError(error)
                    ? (error.response?.data as { message?: string } | undefined)?.message
                    : undefined;
                toast.error(message ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
            },
        });
    });

    return {
        ...form,
        onSubmit,
        isSubmitting: loginMutation.isPending,
    };
}
