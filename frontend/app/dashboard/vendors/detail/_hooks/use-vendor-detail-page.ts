"use client";

import { isAxiosError } from "axios";
import { toast } from "sonner";
import { useVendorDetail } from "@/lib/vendor/approval/queries/useVendorDetail";
import { useApproveVendor } from "@/lib/vendor/approval/mutations/useApproveVendor";
import { useRejectVendor } from "@/lib/vendor/approval/mutations/useRejectVendor";
import { usePendingVendor } from "@/lib/vendor/approval/mutations/usePendingVendor";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useVendorDetailPage(vendorId: number) {
  const isValidId = Number.isFinite(vendorId) && vendorId > 0;
  const { data: vendor, isPending, isError } = useVendorDetail(vendorId);
  const approveVendor = useApproveVendor(vendorId);
  const rejectVendor = useRejectVendor(vendorId);
  const pendingVendor = usePendingVendor(vendorId);

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

  const handleApprove = () => {
    toast.promise(approveVendor.mutateAsync(undefined), {
      loading: "กำลังอนุมัติ...",
      success: "อนุมัติผู้ค้าสำเร็จ",
      error: getErrorMessage,
    });
  };

  const handleReject = (remark: string) => {
    toast.promise(rejectVendor.mutateAsync(remark), {
      loading: "กำลังปฏิเสธ...",
      success: "ปฏิเสธผู้ค้าสำเร็จ",
      error: getErrorMessage,
    });
  };

  const handlePending = () => {
    toast.promise(pendingVendor.mutateAsync(), {
      loading: "กำลังดำเนินการ...",
      success: "ส่งกลับไปรอตรวจสอบแล้ว",
      error: getErrorMessage,
    });
  };

  return {
    vendor,
    isValidId,
    isPending,
    notFound,
    displayName,
    approveVendor,
    rejectVendor,
    pendingVendor,
    handleApprove,
    handleReject,
    handlePending,
  };
}
