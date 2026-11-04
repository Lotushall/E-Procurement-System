import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateInternalProfile } from "@/lib/internal-profiles/mutations/useCreateInternalProfile";
import type { CreateInternalProfilePayload } from "@/lib/internal-profiles/types";
import { handleServerError } from "@/lib/form/server-errors";
import { InternalProfileFormSchema, type InternalProfileFormValues } from "../_schemas/schema";

const DEFAULT_VALUES: InternalProfileFormValues = {
  prefix: "",
  firstname: "",
  lastname: "",
  employeeNo: "",
  departmentId: "",
  positionId: "",
  phone: "",
};

export function useInternalProfileForm(onSubmitted: () => void) {
  const createInternalProfileMutation = useCreateInternalProfile();

  const form = useForm<InternalProfileFormValues>({
    resolver: zodResolver(InternalProfileFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreateInternalProfilePayload = {
      prefix: values.prefix || undefined,
      firstname: values.firstname,
      lastname: values.lastname,
      employeeNo: values.employeeNo || undefined,
      departmentId: values.departmentId ? Number(values.departmentId) : undefined,
      positionId: values.positionId ? Number(values.positionId) : undefined,
      phone: values.phone || undefined,
    };

    const promise = createInternalProfileMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: "กำลังสร้างพนักงาน...",
      success: () => {
        form.reset(DEFAULT_VALUES);
        onSubmitted();
        return "สร้างพนักงานสำเร็จ";
      },
      error: (error) => handleServerError(error, form, "สร้างพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createInternalProfileMutation.isPending,
  };
}
