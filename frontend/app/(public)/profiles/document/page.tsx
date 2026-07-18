"use client";

import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import SectionTitle from "../_components/section-title";
import { Spinner } from "@/components/ui/spinner";

export default function Document() {
    const { data: vendor, isLoading } = useVendorProfile();

    console.log(vendor);

    return (
        <div className="flex flex-col">
            <SectionTitle title="เอกสารประกอบการขึ้นทะเบียน" desc="เอกสารเหล่านี้จะถูกส่งให้เจ้าหน้าที่ตรวจสอบและอนุมัติ" >

            </SectionTitle>

            {!isLoading ? (
                <></>
            ) : (
                <div className="flex justify-center items-center h-70">
                    <Spinner className="size-8" />
                </div>
            )}
        </div>
    )
}
