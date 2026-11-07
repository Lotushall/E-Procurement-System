import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateUser } from "@/lib/user/management/mutations/useUpdateUser";
import { handleServerError } from "@/lib/form/server-errors";
import { UpdateInternalUserSchema, type UpdateInternalUserValues } from "../_schemas/schema";

export function useUpdateInternalUserForm(
  id: number,
  onSubmitted: () => void,
  initialValues: UpdateInternalUserValues,
) {
  const updateUserMutation = useUpdateUser(id);

  const form = useForm<UpdateInternalUserValues>({
    resolver: zodResolver(UpdateInternalUserSchema),
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
