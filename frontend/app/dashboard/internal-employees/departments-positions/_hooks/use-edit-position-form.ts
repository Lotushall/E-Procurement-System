import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdatePosition } from "@/lib/internal-profiles/mutations/useUpdatePosition";
import type { UpdatePositionPayload } from "@/lib/internal-profiles/types";
import { handleServerError } from "@/lib/form/server-errors";
import { PositionFormSchema, type PositionFormValues } from "../_schemas/schema";

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
      error: (error) => handleServerError(error, form, "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updatePositionMutation.isPending,
  };
}
