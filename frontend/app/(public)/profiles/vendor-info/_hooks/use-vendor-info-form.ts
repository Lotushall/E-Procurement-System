import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useUpdateVendorInfo } from "@/lib/vendor/profile/mutations";
import type {
  VendorCompanyInfoValues,
  VendorIndividualInfoValues,
} from "../_schemas/schema";
import {
  VendorCompanyInfoSchema,
  VendorIndividualInfoSchema,
} from "../_schemas/schema";

function applyFieldErrors<T extends Record<string, unknown>>(
  error: unknown,
  setError: (field: keyof T, error: { type: string; message: string }) => void,
): boolean {
  if (!isAxiosError(error) || error.response?.status !== 422) return false;

  const fieldErrors = (error.response.data as { errors?: Record<string, string[]> }).errors;
  if (!fieldErrors) return false;

  Object.entries(fieldErrors).forEach(([field, messages]) => {
    setError(field as keyof T, { type: "server", message: messages[0] });
  });
  return true;
}

function updateErrorMessage<T extends Record<string, unknown>>(
  error: unknown,
  setError: (field: keyof T, error: { type: string; message: string }) => void,
): string {
  if (applyFieldErrors<T>(error, setError)) {
    return "กรุณาตรวจสอบข้อมูลที่กรอก";
  }

  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "บันทึกข้อมูลกิจการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useVendorCompanyInfoForm(detail: VendorCompanyInfoValues) {
  const updateVendorInfoMutation = useUpdateVendorInfo();
  const form = useForm<VendorCompanyInfoValues>({
    mode: "onBlur",
    resolver: zodResolver(VendorCompanyInfoSchema),
    defaultValues: {
      companyName: "",
      businessType: "",
      branchNo: "",
      businessRegistrationNo: "",
      taxId: "",
      address: "",
      province: "",
      postalCode: "",
    },
    values: {
      companyName: detail.companyName ?? "",
      businessType: detail.businessType ?? "",
      branchNo: detail.branchNo ?? "",
      businessRegistrationNo: detail.businessRegistrationNo ?? "",
      taxId: detail.taxId ?? "",
      address: detail.address ?? "",
      province: detail.province ?? "",
      postalCode: detail.postalCode ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(
      updateVendorInfoMutation.mutateAsync({ vendorType: "company", ...values }),
      {
        loading: "กำลังบันทึกข้อมูล...",
        success: "บันทึกข้อมูลกิจการสำเร็จ",
        error: (error) => updateErrorMessage<VendorCompanyInfoValues>(error, form.setError),
      },
    );
  });

  return { ...form, onSubmit, isSubmitting: updateVendorInfoMutation.isPending };
}

export function useVendorIndividualInfoForm(detail: VendorIndividualInfoValues) {
  const updateVendorInfoMutation = useUpdateVendorInfo();
  const form = useForm<VendorIndividualInfoValues>({
    mode: "onBlur",
    resolver: zodResolver(VendorIndividualInfoSchema),
    defaultValues: {
      storeName: "",
      businessType: "",
      prefix: "",
      firstname: "",
      lastname: "",
      citizenId: "",
      taxId: "",
      address: "",
      province: "",
      postalCode: "",
    },
    values: {
      storeName: detail.storeName ?? "",
      businessType: detail.businessType ?? "",
      prefix: detail.prefix || "นาย",
      firstname: detail.firstname ?? "",
      lastname: detail.lastname ?? "",
      citizenId: detail.citizenId ?? "",
      taxId: detail.taxId ?? "",
      address: detail.address ?? "",
      province: detail.province ?? "",
      postalCode: detail.postalCode ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    toast.promise(
      updateVendorInfoMutation.mutateAsync({ vendorType: "individual", ...values }),
      {
        loading: "กำลังบันทึกข้อมูล...",
        success: "บันทึกข้อมูลกิจการสำเร็จ",
        error: (error) => updateErrorMessage<VendorIndividualInfoValues>(error, form.setError),
      },
    );
  });

  return { ...form, onSubmit, isSubmitting: updateVendorInfoMutation.isPending };
}
