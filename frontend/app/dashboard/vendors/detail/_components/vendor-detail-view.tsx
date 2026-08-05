"use client";

import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { useVendorDetail } from "@/lib/vendor/approval/useVendorDetail";
import { useApproveVendor, useRejectVendor } from "@/lib/vendor/approval/mutations";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import { getInitials } from "@/lib/utils";
import { VendorProfileInfo } from "./vendor-profile-info";
import { VendorContactRow } from "./vendor-contact-row";
import { VendorDocumentApprovalRow } from "./vendor-document-approval-row";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function VendorDetailView({ vendorId }: { vendorId: number }) {
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
                <VendorContactRow key={contact.id} contact={contact} />
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
