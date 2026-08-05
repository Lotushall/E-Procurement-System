import type { VendorProfileDetail } from "@/lib/vendor/profile/types";

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

export function VendorProfileInfo({ detail }: { detail: VendorProfileDetail }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">ข้อมูลผู้ค้า</h2>
      <div className="grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-4">
        {detail.type === "company" ? (
          <>
            <InfoItem label="ชื่อบริษัท / นิติบุคคล" value={detail.companyName} />
            <InfoItem label="ประเภทธุรกิจ" value={detail.businessType} />
            <InfoItem label="สาขา" value={detail.branchNo} />
            <InfoItem label="เลขทะเบียนนิติบุคคล" value={detail.businessRegistrationNo} />
            <InfoItem label="เลขผู้เสียภาษี" value={detail.taxId} />
          </>
        ) : (
          <>
            <InfoItem label="ชื่อร้านค้า" value={detail.storeName} />
            <InfoItem label="คำนำหน้า" value={detail.prefix} />
            <InfoItem label="ชื่อ" value={detail.firstname} />
            <InfoItem label="นามสกุล" value={detail.lastname} />
            <InfoItem label="เลขบัตรประชาชน" value={detail.citizenId} />
            <InfoItem label="เลขผู้เสียภาษี" value={detail.taxId} />
            <InfoItem label="ประเภทธุรกิจ" value={detail.businessType} />
            <InfoItem label="อีเมล" value={detail.email} />
            <InfoItem label="เบอร์โทรศัพท์" value={detail.phone} />
          </>
        )}
        <InfoItem label="ที่อยู่" value={detail.address} />
        <InfoItem label="จังหวัด" value={detail.province} />
        <InfoItem label="รหัสไปรษณีย์" value={detail.postalCode} />
      </div>
    </div>
  );
}
