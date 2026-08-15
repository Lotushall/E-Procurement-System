import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateRole } from "@/lib/user/management/mutations/useCreateRole";
import { useUpdateRole } from "@/lib/user/management/mutations/useUpdateRole";
import type { RoleDetail } from "@/lib/user/management/types";
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

export function useRoleForm(onSubmitted: () => void, role?: RoleDetail) {
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole(role?.id ?? 0);

  const initialValues: RoleFormValues = role
    ? { name: role.name, permissions: role.permissions }
    : { name: "", permissions: [] };

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(RoleFormSchema),
    defaultValues: initialValues,
    values: role ? initialValues : undefined,
  });

  const isSubmitting = createRoleMutation.isPending || updateRoleMutation.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const promise = role
      ? updateRoleMutation.mutateAsync(values)
      : createRoleMutation.mutateAsync(values);

    toast.promise(promise, {
      loading: role ? "กำลังบันทึกการแก้ไข..." : "กำลังสร้าง role...",
      success: () => {
        if (!role) form.reset();
        onSubmitted();
        return role ? "บันทึกการแก้ไขสำเร็จ" : "สร้าง role สำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting,
  };
}
