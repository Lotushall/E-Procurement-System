import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateUser } from "@/lib/user/management/mutations/useUpdateUser";
import { handleServerError } from "@/lib/form/server-errors";
import { UpdateAccountSchema, type UpdateAccountValues } from "../_schemas/schema";

export function useUpdateAccountForm(
  id: number,
  onSubmitted: () => void,
  initialValues: UpdateAccountValues,
) {
  const updateUserMutation = useUpdateUser(id);

  const form = useForm<UpdateAccountValues>({
    resolver: zodResolver(UpdateAccountSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(
      updateUserMutation.mutateAsync({ ...values, password: values.password || undefined }),
      {
        loading: "กำลังบันทึกข้อมูล...",
        success: () => {
          onSubmitted();
          return "บันทึกข้อมูลสำเร็จ";
        },
        error: (error) => handleServerError(error, form, "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
      },
    );
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateUserMutation.isPending,
  };
}
