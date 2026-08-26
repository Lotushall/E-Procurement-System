import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdatePosition } from "@/lib/internal-profiles/mutations/useUpdatePosition";
import type { UpdatePositionPayload } from "@/lib/internal-profiles/types";
import { PositionFormSchema, type PositionFormValues } from "../_schemas/schema";

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

export function useEditPositionForm(
  id: number,
  onSubmitted: () => void,
  initialValues: PositionFormValues,
) {
  const updatePositionMutation = useUpdatePosition(id);

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(PositionFormSchema),
    defaultValues: initialValues,
    values: initialValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: UpdatePositionPayload = { name: values.name };

    const promise = updatePositionMutation.mutateAsync(payload);

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
    isSubmitting: updatePositionMutation.isPending,
  };
}
