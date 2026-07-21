import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateAccount } from "@/lib/auth/mutations";
import { useUser } from "@/lib/auth/useUser";
import { AccountInfoSchema, AccountInfoValues } from "../_schemas/schema";

export function useAccountInfoForm() {
  const { data: user } = useUser();
  const updateAccountMutation = useUpdateAccount();

  const form = useForm<AccountInfoValues>({
    resolver: zodResolver(AccountInfoSchema),
    defaultValues: { username: "", email: "" },
    values: user ? { username: user.username, email: user.email } : undefined,
  });

  const onSubmit = form.handleSubmit((values) => {
    const emailChanged = values.email !== user?.email;

    updateAccountMutation.mutate(values, {
      onSuccess: () =>
        toast.success(
          emailChanged
            ? "บันทึกข้อมูลบัญชีแล้ว ระบบส่งลิงก์ยืนยันไปที่อีเมลใหม่ กรุณายืนยันก่อนใช้งาน"
            : "บันทึกข้อมูลบัญชีแล้ว",
        ),
      onError: (error) => {
        const fieldErrors =
          isAxiosError(error) && error.response?.status === 422
            ? (error.response.data as { errors?: Record<string, string[]> })
                .errors
            : undefined;

        const message = fieldErrors
          ? Object.values(fieldErrors)[0]?.[0]
          : isAxiosError(error)
            ? (error.response?.data as { message?: string } | undefined)
                ?.message
            : undefined;

        toast.error(
          message ?? "บันทึกข้อมูลบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        );
      },
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateAccountMutation.isPending,
    isEmailVerified: !!user?.emailVerifiedAt,
  };
}
