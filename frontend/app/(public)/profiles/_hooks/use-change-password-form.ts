import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useChangePassword } from "@/lib/auth/mutations/useChangePassword";
import { handleServerError } from "@/lib/form/server-errors";
import { ChangePasswordSchema, ChangePasswordValues } from "../_schemas/schema";

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
        error: (error) => handleServerError(error, form, "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
      },
    );
  });

  return { ...form, onSubmit, isSubmitting: changePasswordMutation.isPending };
}
