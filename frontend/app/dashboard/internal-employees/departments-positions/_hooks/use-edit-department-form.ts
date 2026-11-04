import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateDepartment } from "@/lib/internal-profiles/mutations/useUpdateDepartment";
import type { UpdateDepartmentPayload } from "@/lib/internal-profiles/types";
import { handleServerError } from "@/lib/form/server-errors";
import { DepartmentFormSchema, type DepartmentFormValues } from "../_schemas/schema";

export function useEditDepartmentForm(
  id: number,
  onSubmitted: () => void,
  initialValues: DepartmentFormValues,
) {
  const updateDepartmentMutation = useUpdateDepartment(id);

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: UpdateDepartmentPayload = { name: values.name };

    const promise = updateDepartmentMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังบันทึกข้อมูล...",
      success: () => {
        onSubmitted();
        return "บันทึกข้อมูลสำเร็จ";
      },
      error: (error) => handleServerError(error, form, "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateDepartmentMutation.isPending,
  };
}
