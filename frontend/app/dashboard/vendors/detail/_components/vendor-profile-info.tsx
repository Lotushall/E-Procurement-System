import { cn } from "@/lib/utils";
import type { VendorProfileDetail } from "@/lib/vendor/profile/types";

const COL_SPAN_CLASSES: Record<number, string> = {
  1: "xl:col-span-1",
  2: "xl:col-span-2",
  3: "xl:col-span-3",
  4: "xl:col-span-4",
};

function InfoItem({
  label,
  value,
  cols,
}: {
  label: string;
  value?: string | null;
  cols?: number;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", cols && COL_SPAN_CLASSES[cols])}>
      <p className="text-xs md:text-sm tracking-wide text-gray-500">{label}</p>
      <p className="rounded-sm border border-input bg-transparent px-2.5 py-2 text-sm md:text-base font-medium wrap-break-word">
        {value || "-"}
      </p>
    </div>
  );
}

export function VendorProfileInfo({ detail }: { detail: VendorProfileDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">ข้อมูลผู้ค้า</h2>
      <div className="grid grid-cols-1 gap-4 rounded-md border bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        {detail.type === "company" ? (
          <>
            <InfoItem label="ชื่อบริษัท / นิติบุคคล" value={detail.companyName} cols={3} />
            <InfoItem label="ประเภทธุรกิจ" value={detail.businessType} />
            <InfoItem label="สาขา" value={detail.branchNo} />
            <InfoItem label="เลขทะเบียนนิติบุคคล" value={detail.businessRegistrationNo} />
            <InfoItem label="เลขผู้เสียภาษี" value={detail.taxId} cols={2} />
            <div className="hidden xl:block" />
          </>
        ) : (
          <>
            <InfoItem label="ชื่อร้านค้า" value={detail.storeName} cols={3} />
            <InfoItem label="ประเภทธุรกิจ" value={detail.businessType} />
            <InfoItem label="คำนำหน้า" value={detail.prefix} />
            <InfoItem label="ชื่อ" value={detail.firstname} />
            <InfoItem label="นามสกุล" value={detail.lastname} />
            <div className="hidden xl:block" />
            <InfoItem label="เลขบัตรประชาชน" value={detail.citizenId} cols={2} />
            <InfoItem label="เลขผู้เสียภาษี" value={detail.taxId} cols={2} />
            <div className="hidden xl:block" />
          </>
        )}
        <InfoItem label="ที่อยู่" value={detail.address} cols={4} />
        <InfoItem label="จังหวัด" value={detail.province} cols={2} />
        <InfoItem label="รหัสไปรษณีย์" value={detail.postalCode} cols={2} />
      </div>
    </div>
  );
}
