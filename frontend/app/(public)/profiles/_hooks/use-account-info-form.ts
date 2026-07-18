import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUser } from "@/lib/auth/useUser";
import { AccountInfoSchema, AccountInfoValues } from "../_schemas/schema";

export function useAccountInfoForm() {
  const { data: user } = useUser();

  const form = useForm<AccountInfoValues>({
    resolver: zodResolver(AccountInfoSchema),
    defaultValues: { username: "", email: "" },
    values: user ? { username: user.username, email: user.email } : undefined,
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log(values);
    toast.success("บันทึกข้อมูลบัญชีแล้ว");
  });

  return { ...form, onSubmit };
}
