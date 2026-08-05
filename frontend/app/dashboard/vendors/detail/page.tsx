"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { VendorDocumentApprovalRow } from "./_components/vendor-document-approval-row";
import { useVendorDetail } from "@/lib/vendor/approval/useVendorDetail";
import { useApproveVendor, useRejectVendor } from "@/lib/vendor/approval/mutations";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { cn, formatPhone, getInitials } from "@/lib/utils";
import type { VendorProfileDetail } from "@/lib/vendor/profile/types";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-medium">{value || "-"}</p>
    </div>
  );
}

function VendorProfileInfo({ detail }: { detail: VendorProfileDetail }) {
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

export default function VendorDetailPage() {
  return (
    <Suspense fallback={null}>
      <VendorDetailContent />
    </Suspense>
  );
}

function VendorDetailContent() {
  const searchParams = useSearchParams();
  const vendorId = Number(searchParams.get("id"));

  const isValidId = Number.isFinite(vendorId) && vendorId > 0;
  const { data: vendor, isPending, isError } = useVendorDetail(vendorId);
  const approveVendor = useApproveVendor(vendorId);
  const rejectVendor = useRejectVendor(vendorId);

  const notFound = !isValidId || (isError && !vendor) || (!isPending && !vendor);
  const displayName = vendor
    ? vendor.detail.type === "company"
      ? vendor.detail.companyName
      : vendor.detail.storeName
    : undefined;

  useBreadcrumb([
    { label: "ผู้ค้าที่ลงทะเบียน", href: routes.dashboards.vendors.index },
    isValidId && isPending ? { loading: true } : { label: displayName ?? "ไม่พบข้อมูล" },
  ]);

  if (isValidId && isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลผู้ค้ารายนี้
      </p>
    );
  }

  const handleApprove = () => {
    toast.promise(approveVendor.mutateAsync(undefined), {
      loading: "กำลังอนุมัติ...",
      success: "อนุมัติผู้ค้าสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-bold text-white">
            {getInitials(displayName ?? "")}
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{vendor.user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VendorStatusBadge status={vendor.verificationStatus} />
          <Button type="button" onClick={handleApprove} disabled={approveVendor.isPending}>
            อนุมัติผู้ค้า
          </Button>
          <RejectReasonDialog
            trigger={<Button type="button" variant="destructive" />}
            triggerChildren="ปฏิเสธผู้ค้า"
            title="ปฏิเสธผู้ค้า"
            description={`ระบุเหตุผลที่ปฏิเสธ "${displayName}"`}
            isPending={rejectVendor.isPending}
            onConfirm={(remark) =>
              toast.promise(rejectVendor.mutateAsync(remark), {
                loading: "กำลังปฏิเสธ...",
                success: "ปฏิเสธผู้ค้าสำเร็จ",
                error: getErrorMessage,
              })
            }
          />
        </div>
      </div>

      <VendorProfileInfo detail={vendor.detail} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">ผู้ติดต่อ</h2>
        {(vendor.contact ?? []).length > 0 ? (
          <div className="flex flex-col gap-2">
            {[...(vendor.contact ?? [])]
              .sort((a, b) => (b.isMainContact ? 1 : 0) - (a.isMainContact ? 1 : 0))
              .map((contact) => (
                <div key={contact.id} className="flex items-center gap-3.5 rounded-md border p-4">
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-md font-bold text-white",
                      contact.isMainContact ? "bg-red-700" : "bg-gray-200 text-gray-500",
                    )}
                  >
                    {getInitials(contact.contactName)}
                  </div>

                  <div className="flex min-w-0 flex-col">
                    <div className="flex flex-col-reverse gap-1 md:flex-row md:items-center md:gap-2.5">
                      <p className="font-bold tracking-wide capitalize">{contact.contactName}</p>
                      {contact.isMainContact && (
                        <Badge className="bg-red-100 text-red-800 tracking-wider">
                          ผู้ติดต่อหลัก
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1 text-sm font-thin tracking-wide text-gray-600">
                      <p className="capitalize">{contact.contactPosition || contact.contactName}</p>
                      {contact.contactPhone && <p> · {formatPhone(contact.contactPhone)}</p>}
                      {contact.contactEmail && <p className="break-all"> · {contact.contactEmail}</p>}
                      {contact.lineId && <p> · {contact.lineId}</p>}
                      {contact.otherContact && <p> · {contact.otherContact}</p>}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีผู้ติดต่อ</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">เอกสาร</h2>
        {vendor.document && vendor.document.length > 0 ? (
          <div className="flex flex-col gap-2">
            {vendor.document.map((doc) => (
              <VendorDocumentApprovalRow
                key={doc.id}
                vendorId={vendorId}
                document={doc}
                vendorType={vendor.detail.type}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">ยังไม่มีเอกสารที่อัปโหลด</p>
        )}
      </div>
    </div>
  );
}
