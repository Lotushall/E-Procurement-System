import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreatePermission } from "@/lib/user/management/mutations/useCreatePermission";
import { useUpdatePermission } from "@/lib/user/management/mutations/useUpdatePermission";
import type { Permission } from "@/lib/user/management/types";
import { handleServerError } from "@/lib/form/server-errors";
import { PermissionFormSchema, type PermissionFormValues } from "../_schemas/permission-schema";

export function usePermissionForm(onSubmitted: () => void, permission?: Permission) {
  const createPermissionMutation = useCreatePermission();
  const updatePermissionMutation = useUpdatePermission(permission?.name ?? "");

  const initialValues: PermissionFormValues = permission
    ? { name: permission.name, label: permission.label }
    : { name: "", label: "" };

  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(PermissionFormSchema),
    defaultValues: initialValues,
    values: permission ? initialValues : undefined,
  });

  const isSubmitting = createPermissionMutation.isPending || updatePermissionMutation.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const promise = permission
      ? updatePermissionMutation.mutateAsync(values)
      : createPermissionMutation.mutateAsync(values);

    toast.promise(promise, {
      loading: permission ? "กำลังบันทึกการแก้ไข..." : "กำลังสร้าง permission...",
      success: () => {
        if (!permission) form.reset();
        onSubmitted();
        return permission ? "บันทึกการแก้ไขสำเร็จ" : "สร้าง permission สำเร็จ";
      },
      error: (error) => handleServerError(error, form, "บันทึก permission ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting,
  };
}
