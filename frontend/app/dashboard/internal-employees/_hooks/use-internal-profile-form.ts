import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCreateInternalProfile } from "@/lib/internal-profiles/mutations/useCreateInternalProfile";
import type { CreateInternalProfilePayload } from "@/lib/internal-profiles/types";
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

  return message ?? "สร้างพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

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
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: createInternalProfileMutation.isPending,
  };
}
