import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { handleServerError } from "@/lib/form/server-errors";
import { useCreateDepartment } from "@/lib/internal-profiles/mutations/useCreateDepartment";
import type { CreateDepartmentPayload } from "@/lib/internal-profiles/types";
import { DepartmentFormSchema, type DepartmentFormValues } from "../_schemas/schema";

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
      error: (error) => handleServerError(error, form, "สร้างแผนกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createDepartmentMutation.isPending,
  };
}
