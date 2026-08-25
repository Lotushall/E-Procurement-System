import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateInternalProfile } from "@/lib/internal-profiles/mutations/useUpdateInternalProfile";
import type { UpdateInternalProfilePayload } from "@/lib/internal-profiles/types";
import { InternalProfileFormSchema, type InternalProfileFormValues } from "../_schemas/schema";

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

export function useEditInternalProfileForm(
  id: number,
  onSubmitted: () => void,
  initialValues: InternalProfileFormValues,
) {
  const updateInternalProfileMutation = useUpdateInternalProfile(id);

  const form = useForm<InternalProfileFormValues>({
    resolver: zodResolver(InternalProfileFormSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: UpdateInternalProfilePayload = {
      prefix: values.prefix || undefined,
      firstname: values.firstname,
      lastname: values.lastname,
      employeeNo: values.employeeNo || undefined,
      departmentId: values.departmentId ? Number(values.departmentId) : undefined,
      positionId: values.positionId ? Number(values.positionId) : undefined,
      phone: values.phone || undefined,
    };

    const promise = updateInternalProfileMutation.mutateAsync(payload);

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
    isSubmitting: updateInternalProfileMutation.isPending,
  };
}
