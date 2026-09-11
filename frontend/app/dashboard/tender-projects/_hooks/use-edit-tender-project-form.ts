import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateTenderProject } from "@/lib/tender/tender-projects/mutations/useUpdateTenderProject";
import type { TenderProjects, UpdateTenderProjectPayload } from "@/lib/tender/tender-projects/types";
import { UpdateTenderProjectSchema, type UpdateTenderProjectFormValues } from "../_schemas/schema";

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

  return message ?? "บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

// budget มาเป็น "186000000.00": ตัด ".00" ทิ้ง แต่เก็บทศนิยม 2 หลักไว้เมื่อมีสตางค์
// เพื่อให้ "500000.50" แสดงเป็น 500,000.50 ไม่ใช่ 500,000.5
function toBudgetInput(budget: string): string {
  const amount = Number(budget);
  if (!budget || Number.isNaN(amount)) return "";
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

// API ส่ง shape ที่ไม่ตรงกับฟอร์ม: budget มีทศนิยมห้อยท้าย, fiscalYear เป็น number,
// วันที่เป็น ISO แบบ UTC, department/personInCharge เป็น object ที่อาจไม่มีมา
// ส่วนฟอร์มเก็บทุกอย่างเป็น string
export function toFormValues(project: TenderProjects): UpdateTenderProjectFormValues {
  return {
    name: project.name,
    description: project.description ?? "",
    budget: toBudgetInput(project.budget),
    departmentId: project.department?.id ? String(project.department.id) : "",
    personInChargeId: project.personInCharge?.id ? String(project.personInCharge.id) : "",
    procurementMethod: project.procurementMethod,
    fiscalYear: project.fiscalYear != null ? String(project.fiscalYear) : "",
    projectStartAt: project.projectStartAt ? format(new Date(project.projectStartAt), "yyyy-MM-dd") : "",
    projectEndAt: project.projectEndAt ? format(new Date(project.projectEndAt), "yyyy-MM-dd") : "",
  };
}

export function useEditTenderProjectForm(project: TenderProjects, onSubmitted: () => void) {
  const updateTenderProjectMutation = useUpdateTenderProject();

  const form = useForm<UpdateTenderProjectFormValues>({
    resolver: zodResolver(UpdateTenderProjectSchema),
    defaultValues: toFormValues(project),
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: UpdateTenderProjectPayload = {
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

    const promise = updateTenderProjectMutation.mutateAsync({ id: project.id, payload });

    toast.promise(promise, {
      loading: "กำลังบันทึกการแก้ไข...",
      success: () => {
        onSubmitted();
        return "บันทึกการแก้ไขสำเร็จ";
      },
      error: getErrorMessage,
    });
  });

  return {
    ...form,
    onSubmit,
    isSubmitting: updateTenderProjectMutation.isPending,
  };
}
