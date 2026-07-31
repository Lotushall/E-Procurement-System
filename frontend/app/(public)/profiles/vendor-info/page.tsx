// app/(public)/profiles/vendor-info/page.tsx
"use client";

import { useVendorProfile } from "@/lib/vendor/profile/useVendorProfile";
import { Spinner } from "@/components/ui/spinner";
import SectionTitle from "../_components/section-title";
import CompanyInfoForm from "./_components/company-info-form";
import IndividualInfoForm from "./_components/individual-info-form";
import { useIsVendorInfoSubmitting } from "@/lib/vendor/profile/mutations";

export default function VendorInfo() {
  const { data: vendor, isLoading } = useVendorProfile();
  const isVendorInfoSubmitting = useIsVendorInfoSubmitting();

  return (
    <div className="relative flex flex-col">
      {isVendorInfoSubmitting && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
          <Spinner className="size-8" />
        </div>
      )}

      <SectionTitle title="ข้อมูลบริษัท / นิติบุคคล" desc="ข้อมูลนี้จะปรากฏในเอกสารการเสนอราคาและสัญญา" />

      {vendor && !isLoading ? (
        vendor.detail.type === "company" ? (
          <CompanyInfoForm detail={vendor.detail} />
        ) : (
          <IndividualInfoForm detail={vendor.detail} />
        )
      ) : (
        <div className="flex justify-center items-center h-70">
          <Spinner className="size-8" />
        </div>
      )}
    </div>
  );
}
