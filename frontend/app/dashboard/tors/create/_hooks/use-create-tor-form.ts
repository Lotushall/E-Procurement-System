import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useCreateTor } from "@/lib/tender/tor/mutations/useCreateTor";
import type { CreateTorPayload, Tor } from "@/lib/tender/tor/types";
import { handleServerError } from "@/lib/form/server-errors";
import { NEXT_FISCAL_YEAR } from "@/lib/tender/fiscal-year-options";
import { CreateTorSchema } from "../_schemas/schema";

export type CreateTorFormValues = z.infer<typeof CreateTorSchema>;

const DEFAULT_VALUES: CreateTorFormValues = {
  title: "",
  scopeOfWork: "",
  departmentId: "",
  tenderProjectId: "",
  budgetEstimate: "",
  procurementMethod: "",
  fiscalYear: String(NEXT_FISCAL_YEAR),
  biddingStartAt: "",
  biddingEndAt: "",
};

// คืน form แยกออกมา (ไม่ spread) เพราะหน้าสร้างส่งต่อให้ FormProvider ทั้งก้อน
export function useCreateTorForm(onSubmitted: (tor: Tor) => void) {
  const createTorMutation = useCreateTor();

  const form = useForm<CreateTorFormValues>({
    resolver: zodResolver(CreateTorSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: CreateTorPayload = {
      title: values.title,
      scopeOfWork: values.scopeOfWork,
      departmentId: Number(values.departmentId),
      tenderProjectId: values.tenderProjectId ? Number(values.tenderProjectId) : null,
      budgetEstimate: Number(values.budgetEstimate),
      procurementMethod: values.procurementMethod,
      fiscalYear: Number(values.fiscalYear),
      biddingStartAt: values.biddingStartAt || null,
      biddingEndAt: values.biddingEndAt || null,
    };

    toast.promise(createTorMutation.mutateAsync(payload), {
      loading: "กำลังบันทึก TOR...",
      success: (tor) => {
        onSubmitted(tor);
        return `บันทึก TOR ฉบับร่างสำเร็จ (${tor.torCode})`;
      },
      error: (error) => handleServerError(error, form, "บันทึก TOR ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    });
  });

  return {
    form,
    onSubmit,
    isSubmitting: createTorMutation.isPending,
  };
}
