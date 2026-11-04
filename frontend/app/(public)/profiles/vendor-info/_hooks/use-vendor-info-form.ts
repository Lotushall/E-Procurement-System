import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { handleServerError } from "@/lib/form/server-errors";
import { useUpdateVendorInfo } from "@/lib/vendor/profile/mutations/useUpdateVendorInfo";
import type {
  VendorCompanyInfoValues,
  VendorIndividualInfoValues,
} from "../_schemas/schema";
import {
  VendorCompanyInfoSchema,
  VendorIndividualInfoSchema,
} from "../_schemas/schema";

const SAVE_FAILED_MESSAGE = "บันทึกข้อมูลกิจการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

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
        error: (error) => handleServerError(error, form, SAVE_FAILED_MESSAGE),
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
        error: (error) => handleServerError(error, form, SAVE_FAILED_MESSAGE),
      },
    );
  });

  return { ...form, onSubmit, isSubmitting: updateVendorInfoMutation.isPending };
}
