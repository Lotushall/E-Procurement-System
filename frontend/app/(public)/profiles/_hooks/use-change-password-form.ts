import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useChangePassword } from "@/lib/auth/mutations";
import { ChangePasswordSchema, ChangePasswordValues } from "../_schemas/schema";

export function useChangePasswordForm() {
  const changePasswordMutation = useChangePassword();

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    changePasswordMutation.mutate(
      {
        currentPassword: values.currentPassword,
        password: values.password,
        password_confirmation: values.confirmPassword,
      },
      {
        onSuccess: () => {
          toast.success("เปลี่ยนรหัสผ่านแล้ว");
          form.reset();
        },
        onError: (error) => {
          const fieldErrors = isAxiosError(error) && error.response?.status === 422
            ? (error.response.data as { errors?: Record<string, string[]> }).errors
            : undefined;

          const message = fieldErrors
            ? Object.values(fieldErrors)[0]?.[0]
            : isAxiosError(error)
              ? (error.response?.data as { message?: string } | undefined)?.message
              : undefined;

          toast.error(message ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        },
      },
    );
  });

  return { ...form, onSubmit, isSubmitting: changePasswordMutation.isPending };
}
