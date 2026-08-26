import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateDepartment } from "@/lib/internal-profiles/mutations/useUpdateDepartment";
import type { UpdateDepartmentPayload } from "@/lib/internal-profiles/types";
import { DepartmentFormSchema, type DepartmentFormValues } from "../_schemas/schema";

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
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateDepartmentMutation.isPending,
  };
}
