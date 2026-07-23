import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useChangePassword } from "@/lib/auth/mutations";
import { ChangePasswordSchema, ChangePasswordValues } from "../_schemas/schema";

function getErrorMessage(error: unknown): string {
  const fieldErrors = isAxiosError(error) && error.response?.status === 422
    ? (error.response.data as { errors?: Record<string, string[]> }).errors
    : undefined;

  const message = fieldErrors
    ? Object.values(fieldErrors)[0]?.[0]
    : isAxiosError(error)
      ? (error.response?.data as { message?: string } | undefined)?.message
      : undefined;

  return message ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useChangePasswordForm() {
  const changePasswordMutation = useChangePassword();

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(
      changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        password: values.password,
        password_confirmation: values.confirmPassword,
      }),
      {
        loading: "กำลังเปลี่ยนรหัสผ่าน...",
        success: () => {
          form.reset();
          return "เปลี่ยนรหัสผ่านแล้ว";
        },
        error: getErrorMessage,
      },
    );
  });

  return { ...form, onSubmit, isSubmitting: changePasswordMutation.isPending };
}
