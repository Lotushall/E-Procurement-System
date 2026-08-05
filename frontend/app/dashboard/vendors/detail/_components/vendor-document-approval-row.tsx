"use client";

import Link from "next/link";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { getVendorDocumentViewUrl } from "@/lib/vendor/profile/api";
import type { VendorDocument } from "@/lib/vendor/profile/types";
import { REQUIRED_DOCUMENTS } from "@/app/(public)/profiles/data/document-types";
import { useApproveVendorDocument } from "@/lib/vendor/approval/mutations/useApproveVendorDocument";
import { useRejectVendorDocument } from "@/lib/vendor/approval/mutations/useRejectVendorDocument";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function VendorDocumentApprovalRow({
  vendorId,
  document,
  vendorType,
}: {
  vendorId: number;
  document: VendorDocument;
  vendorType: "company" | "individual";
}) {
  const approveDoc = useApproveVendorDocument(vendorId);
  const rejectDoc = useRejectVendorDocument(vendorId);

  const label =
    REQUIRED_DOCUMENTS[vendorType].find((d) => d.key === document.documentType)?.label ??
    document.documentType;

  const handleApprove = () => {
    toast.promise(approveDoc.mutateAsync(document.id), {
      loading: "กำลังอนุมัติเอกสาร...",
      success: "อนุมัติเอกสารสำเร็จ",
      error: getErrorMessage,
    });
  };

  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-md border p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          href={getVendorDocumentViewUrl(document.id)}
          target="_blank"
          rel="noopener"
          className="font-bold hover:underline"
        >
          {label}
        </Link>
        <p className="text-sm text-muted-foreground">{document.fileName}</p>
        <VendorStatusBadge status={document.status} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" size="sm" onClick={handleApprove} disabled={approveDoc.isPending}>
          อนุมัติ
        </Button>
        <RejectReasonDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
            />
          }
          triggerChildren="ปฏิเสธ"
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
      </div>
    </div>
  );
}
