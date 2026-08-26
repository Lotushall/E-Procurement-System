import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateDepartment } from "@/lib/internal-profiles/mutations/useCreateDepartment";
import type { CreateDepartmentPayload } from "@/lib/internal-profiles/types";
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

  return message ?? "สร้างแผนกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

const DEFAULT_VALUES: DepartmentFormValues = {
  name: "",
};

export function useDepartmentForm(onSubmitted: () => void) {
  const createDepartmentMutation = useCreateDepartment();

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(DepartmentFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreateDepartmentPayload = { name: values.name };

    const promise = createDepartmentMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังสร้างแผนก...",
      success: () => {
        form.reset(DEFAULT_VALUES);
        onSubmitted();
        return "สร้างแผนกสำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createDepartmentMutation.isPending,
  };
}
