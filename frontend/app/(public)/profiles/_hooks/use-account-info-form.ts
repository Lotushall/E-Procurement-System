import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateAccount } from "@/lib/auth/mutations/useUpdateAccount";
import { useUser } from "@/lib/auth/queries/useUser";
import { handleServerError } from "@/lib/form/server-errors";
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

    toast.promise(updateAccountMutation.mutateAsync(values), {
      loading: "กำลังบันทึกข้อมูลบัญชี...",
      success: () =>
        emailChanged
          ? "บันทึกข้อมูลบัญชีแล้ว ระบบส่งลิงก์ยืนยันไปที่อีเมลใหม่ กรุณายืนยันก่อนใช้งาน"
          : "บันทึกข้อมูลบัญชีแล้ว",
      error: (error) => handleServerError(error, form, "บันทึกข้อมูลบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateAccountMutation.isPending,
    isEmailVerified: !!user?.emailVerifiedAt,
  };
}
