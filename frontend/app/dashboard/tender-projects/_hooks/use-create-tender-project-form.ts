import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateTenderProject } from "@/lib/tender/tender-projects/mutations/useCreateTenderProject";
import type { CreateTenderProjectPayload } from "@/lib/tender/tender-projects/types";
import { handleServerError } from "@/lib/form/server-errors";
import { CreateTenderProjectSchema, type CreateTenderProjectFormValues } from "../_schemas/schema";

const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;

const DEFAULT_VALUES: CreateTenderProjectFormValues = {
  name: "",
  description: "",
  budget: "",
  departmentId: "",
  personInChargeId: "",
  procurementMethod: "",
  fiscalYear: String(CURRENT_BUDDHIST_YEAR + 1),
  projectStartAt: "",
  projectEndAt: "",
};

export function useCreateTenderProjectForm(onSubmitted: () => void) {
  const createTenderProjectMutation = useCreateTenderProject();

  const form = useForm<CreateTenderProjectFormValues>({
    resolver: zodResolver(CreateTenderProjectSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreateTenderProjectPayload = {
      name: values.name,
      description: values.description || undefined,
      budget: Number(values.budget),
      departmentId: Number(values.departmentId),
      personInChargeId: values.personInChargeId ? Number(values.personInChargeId) : undefined,
      procurementMethod: values.procurementMethod,
      fiscalYear: Number(values.fiscalYear),
      projectStartAt: values.projectStartAt || undefined,
      projectEndAt: values.projectEndAt || undefined,
    };

    const promise = createTenderProjectMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังสร้างโครงการ...",
      success: (data) => {
        form.reset(DEFAULT_VALUES);
        onSubmitted();
        return `สร้างโครงการสำเร็จ (${data.projectCode})`;
      },
      error: (error) => handleServerError(error, form, "สร้างโครงการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createTenderProjectMutation.isPending,
  };
}
