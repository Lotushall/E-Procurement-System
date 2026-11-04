import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useLogin } from "@/lib/auth/mutations/useLogin";
import { handleServerError } from "@/lib/form/server-errors";
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
                toast.error(handleServerError(error, form, "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
            },
        });
    });

    return {
        ...form,
        onSubmit,
        isSubmitting: loginMutation.isPending,
    };
}
