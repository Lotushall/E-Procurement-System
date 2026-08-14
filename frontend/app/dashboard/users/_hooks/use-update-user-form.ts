import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateUser } from "@/lib/user/management/mutations/useUpdateUser";
import { UpdateUserSchema, type UpdateUserValues } from "../_schemas/schema";

function getErrorMessage(error: unknown): string {
  const fieldErrors =
    isAxiosError(error) && error.response?.status === 422
      ? (error.response.data as { errors?: Record<string, string[]> }).errors
      : undefined;

  const message = fieldErrors
    ? Object.values(fieldErrors)[0]?.[0]
    : isAxiosError(error)
      ? (error.response?.data as { message?: string } | undefined)?.message
      : undefined;

  return message ?? "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useUpdateUserForm(
  id: number,
  onSubmitted: () => void,
  initialValues: UpdateUserValues,
) {
  const updateUserMutation = useUpdateUser(id);

  const form = useForm<UpdateUserValues>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(updateUserMutation.mutateAsync(values), {
      loading: "กำลังบันทึกข้อมูล...",
      success: () => {
        onSubmitted();
        return "บันทึกข้อมูลสำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateUserMutation.isPending,
  };
}
