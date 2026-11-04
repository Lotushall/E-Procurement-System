import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreatePosition } from "@/lib/internal-profiles/mutations/useCreatePosition";
import type { CreatePositionPayload } from "@/lib/internal-profiles/types";
import { handleServerError } from "@/lib/form/server-errors";
import { PositionFormSchema, type PositionFormValues } from "../_schemas/schema";

const DEFAULT_VALUES: PositionFormValues = {
  name: "",
};

export function usePositionForm(onSubmitted: () => void) {
  const createPositionMutation = useCreatePosition();

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(PositionFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreatePositionPayload = { name: values.name };

    const promise = createPositionMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังสร้างตำแหน่ง...",
      success: () => {
        form.reset(DEFAULT_VALUES);
        onSubmitted();
        return "สร้างตำแหน่งสำเร็จ";
      },
      error: (error) => handleServerError(error, form, "สร้างตำแหน่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createPositionMutation.isPending,
  };
}
