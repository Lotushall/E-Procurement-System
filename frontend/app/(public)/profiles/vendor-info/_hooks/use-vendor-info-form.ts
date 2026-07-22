import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type {
  VendorCompanyInfoValues,
  VendorIndividualInfoValues,
} from "../_schemas/schema";
import {
  VendorCompanyInfoSchema,
  VendorIndividualInfoSchema,
} from "../_schemas/schema";

export function useVendorCompanyInfoForm(detail: VendorCompanyInfoValues) {
  const form = useForm<VendorCompanyInfoValues>({
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
    values: detail,
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log({ vendorType: "company", ...values });
  });

  return { ...form, onSubmit };
}

export function useVendorIndividualInfoForm(detail: VendorIndividualInfoValues) {
  const form = useForm<VendorIndividualInfoValues>({
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
    values: { ...detail, prefix: detail.prefix || "นาย" },
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log({ vendorType: "individual", ...values });
  });

  return { ...form, onSubmit };
}
