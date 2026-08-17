import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateRole } from "@/lib/user/management/mutations/useCreateRole";
import { RoleFormSchema, type RoleFormValues } from "../_schemas/schema";

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

  return message ?? "บันทึก role ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useRoleForm(onSubmitted: () => void) {
  const createRoleMutation = useCreateRole();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(RoleFormSchema),
    defaultValues: { name: "", permissions: [] },
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(createRoleMutation.mutateAsync(values), {
      loading: "กำลังสร้าง role...",
      success: () => {
        form.reset();
        onSubmitted();
        return "สร้าง role สำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createRoleMutation.isPending,
  };
}
