"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { getVendorDocumentViewUrl } from "@/lib/vendor/profile/api";
import type { VendorDocument } from "@/lib/vendor/profile/types";
import { useApproveVendorDocument } from "@/lib/vendor/approval/mutations/useApproveVendorDocument";
import { useRejectVendorDocument } from "@/lib/vendor/approval/mutations/useRejectVendorDocument";
import { usePendingVendorDocument } from "@/lib/vendor/approval/mutations/usePendingVendorDocument";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function VendorDocumentApprovalRow({
  vendorId,
  document,
  label,
  required,
}: {
  vendorId: number;
  document?: VendorDocument;
  label: string;
  required: boolean;
}) {
  const approveDoc = useApproveVendorDocument(vendorId);
  const rejectDoc = useRejectVendorDocument(vendorId);
  const pendingDoc = usePendingVendorDocument(vendorId);

  const fileExtension = document?.fileName.split(".").pop()?.toUpperCase();
  const viewUrl = document ? getVendorDocumentViewUrl(document.id) : undefined;
  const isActionPending = approveDoc.isPending || rejectDoc.isPending || pendingDoc.isPending;

  const handleApprove = () => {
    if (!document) return;
    toast.promise(approveDoc.mutateAsync(document.id), {
      loading: "กำลังอนุมัติเอกสาร...",
      success: "อนุมัติเอกสารสำเร็จ",
      error: getErrorMessage,
    });
  };

  const handlePending = () => {
    if (!document) return;
    toast.promise(pendingDoc.mutateAsync(document.id), {
      loading: "กำลังดำเนินการ...",
      success: "ส่งกลับไปรอตรวจสอบแล้ว",
      error: getErrorMessage,
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3.5">
        {viewUrl ? (
          <Link
            href={viewUrl}
            target="_blank"
            rel="noopener"
            aria-label={`ดูไฟล์ ${label}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-xs font-bold text-white transition-colors hover:bg-red-800"
          >
            {fileExtension}
          </Link>
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gray-200 text-gray-600">
            <FileText size={20} />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col-reverse gap-1 md:flex-row md:items-center md:gap-2.5">
            <div className="flex items-center gap-1.5">
              {viewUrl ? (
                <Link
                  href={viewUrl}
                  target="_blank"
                  rel="noopener"
                  className="font-bold tracking-wide hover:underline"
                >
                  {label}
                </Link>
              ) : (
                <p className="font-bold tracking-wide">{label}</p>
              )}
              {required && !document && (
                <span
                  className="h-1.75 w-1.75 shrink-0 rounded-full bg-red-600"
                  role="img"
                  aria-label="เอกสารบังคับ"
                  title="เอกสารบังคับ"
                />
              )}
            </div>

            <div className="flex flex-row items-center gap-1">
              {!required && (
                <Badge className="bg-gray-100 text-gray-600 tracking-wider">ไม่บังคับ</Badge>
              )}
              {document && <VendorStatusBadge status={document.status} />}
            </div>
          </div>

          <p className="flex items-center wrap-break-word text-xs font-thin tracking-wide text-gray-600">
            {document?.fileName ?? "ยังไม่มีเอกสาร"}
          </p>
          {document?.status === "rejected" && document.remark && (
            <p className="wrap-break-word text-sm text-red-600">เหตุผล: {document.remark}</p>
          )}
        </div>
      </div>

      {document && (
        <div className="flex shrink-0 items-center justify-end gap-2">
          {document.status !== "pending" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePending}
              disabled={isActionPending}
            >
              {pendingDoc.isPending ? "กำลังดำเนินการ..." : "รอตรวจสอบ"}
            </Button>
          )}
          {document.status !== "approved" && (
            <Button
              type="button"
              size="sm"
              onClick={handleApprove}
              disabled={isActionPending}
            >
              {approveDoc.isPending ? "กำลังดำเนินการ..." : "อนุมัติ"}
            </Button>
          )}
          {document.status !== "rejected" && (
            <RejectReasonDialog
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isActionPending}
                  className="text-destructive hover:bg-destructive/10"
                />
              }
              triggerChildren={rejectDoc.isPending ? "กำลังดำเนินการ..." : "ปฏิเสธ"}
              title="ปฏิเสธเอกสาร"
              description={`ระบุเหตุผลที่ปฏิเสธเอกสาร "${document.fileName}"`}
              isPending={rejectDoc.isPending}
              onConfirm={(remark) =>
                toast.promise(rejectDoc.mutateAsync({ documentId: document.id, remark }), {
                  loading: "กำลังปฏิเสธเอกสาร...",
                  success: "ปฏิเสธเอกสารสำเร็จ",
                  error: getErrorMessage,
                })
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
