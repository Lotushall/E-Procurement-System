import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateRole } from "@/lib/user/management/mutations/useCreateRole";
import { useUpdateRole } from "@/lib/user/management/mutations/useUpdateRole";
import type { RoleDetail } from "@/lib/user/management/types";
import { handleServerError } from "@/lib/form/server-errors";
import { RoleFormSchema, type RoleFormValues } from "../_schemas/schema";

export function useRoleForm(onSubmitted: () => void, role?: RoleDetail) {
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole(role?.id ?? 0);

  const initialValues: RoleFormValues = role
    ? { name: role.name, permissions: role.permissions ?? [] }
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
      error: (error) => handleServerError(error, form, "บันทึก role ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting,
  };
}
