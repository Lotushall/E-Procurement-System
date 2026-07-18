import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ChangePasswordSchema, ChangePasswordValues } from "../_schemas/schema";

export function useChangePasswordForm() {
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log(values);
    toast.success("เปลี่ยนรหัสผ่านแล้ว");
    form.reset();
  });

  return { ...form, onSubmit };
}
