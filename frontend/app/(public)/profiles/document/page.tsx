"use client";

import { useVendorProfile } from "@/lib/vendor/profile/queries/useVendorProfile";
import SectionTitle from "../_components/section-title";
import DocumentRow from "./_components/document-row";
import { REQUIRED_DOCUMENTS } from "../data/document-types";
import { Spinner } from "@/components/ui/spinner";

export default function Document() {
    const { data: vendor, isLoading } = useVendorProfile();

    return (
        <div className="flex flex-col">
            <SectionTitle title="เอกสารประกอบการขึ้นทะเบียน" desc="เอกสารเหล่านี้จะถูกส่งให้เจ้าหน้าที่ตรวจสอบและอนุมัติ" />

            {isLoading ? (
                <div className="flex justify-center items-center h-70">
                    <Spinner className="size-8" />
                </div>
            ) : vendor ? (
                <div className="flex flex-col gap-2">
                    {REQUIRED_DOCUMENTS[vendor.detail.type].map((doc) => (
                        <DocumentRow
                            key={doc.key}
                            documentType={doc.key}
                            label={doc.label}
                            required={doc.required}
                            fileKind={doc.fileKind}
                            existingDocument={vendor.document?.find((d) => d.documentType === doc.key)}
                        />
                    ))}
                </div>
            ) : (
                // โหลดไม่สำเร็จหรือยังไม่มีโปรไฟล์ — ไม่รู้ประเภทผู้ค้าจึงแสดงรายการเอกสารไม่ได้
                <p className="py-12 text-center text-sm text-muted-foreground">
                    ไม่สามารถโหลดข้อมูลผู้ค้าได้ กรุณาลองใหม่อีกครั้ง
                </p>
            )}
        </div>
    )
}
