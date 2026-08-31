"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VendorStatusBadge } from "@/components/vendor-status-badge";
import { DeleteVendorDialog } from "@/app/dashboard/vendors/_components/delete-vendor-dialog";
import { RejectReasonDialog } from "@/app/dashboard/vendors/_components/reject-reason-dialog";
import { VendorDocumentApprovalRow } from "./_components/vendor-document-approval-row";
import { VendorProfileInfo } from "./_components/vendor-profile-info";
import { useVendorDetailPage } from "./_hooks/use-vendor-detail-page";
import { REQUIRED_DOCUMENTS } from "@/app/(public)/profiles/data/document-types";
import { routes } from "@/lib/routes";
import { cn, formatPhone, getInitials } from "@/lib/utils";

function VendorDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = Number(searchParams.get("id"));

  const {
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
  } = useVendorDetailPage(vendorId);

  const isVendorActionPending =
    approveVendor.isPending || rejectVendor.isPending || pendingVendor.isPending;

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

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        {/* Vendor profile header */}
        <div className="flex items-center gap-3.5">

          {/* Info */}
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-bold text-white">
            {getInitials(displayName ?? "")}
          </div>

          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">
              {vendor.user?.email}

              {vendor.user?.id && (
                <Link
                  href={routes.dashboards.user.detail(vendor.user.id)}
                  className="ml-2 text-red-700 hover:underline"
                >
                  ดูบัญชีผู้ใช้
                </Link>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <VendorStatusBadge status={vendor.verificationStatus} />
            {vendor.verificationStatus === "rejected" && vendor.remark ? (
              <p className="max-w-60 wrap-break-word text-sm text-red-600">เหตุผล: {vendor.remark}</p>
            ) : (
              <div className="h-4" />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">

          {vendor.verificationStatus !== "pending" && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePending}
              disabled={isVendorActionPending}
            >
              {pendingVendor.isPending ? "กำลังดำเนินการ..." : "รอตรวจสอบ"}
            </Button>
          )}

          {vendor.verificationStatus !== "approved" && (
            <Button type="button" onClick={handleApprove} disabled={isVendorActionPending}>
              {approveVendor.isPending ? "กำลังดำเนินการ..." : "อนุมัติผู้ค้า"}
            </Button>
          )}

          {vendor.verificationStatus !== "rejected" && (
            <RejectReasonDialog
              trigger={
                <Button type="button" variant="destructive" disabled={isVendorActionPending} />
              }
              triggerChildren={rejectVendor.isPending ? "กำลังดำเนินการ..." : "ปฏิเสธผู้ค้า"}
              title="ปฏิเสธผู้ค้า"
              description={`ระบุเหตุผลที่ปฏิเสธ "${displayName}"`}
              isPending={rejectVendor.isPending}
              onConfirm={handleReject}
            />
          )}

          <DeleteVendorDialog
            vendorId={vendorId}
            displayName={displayName ?? ""}
            trigger={<Button type="button" variant="destructive" className="mr-auto" disabled={isVendorActionPending} />}
            triggerChildren="ลบผู้ค้า"
            onSuccess={() => router.push(routes.dashboards.vendors.index)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Profile Information */}
        <div className="flex-1 min-w-0">
          <VendorProfileInfo detail={vendor.detail} />
        </div>

        {/* Contact Information */}
        <div className="flex flex-1 min-w-0 flex-col gap-3">
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
      </div>

      {/* Document Information */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">เอกสาร</h2>
        <div className="flex flex-col gap-2">
          {REQUIRED_DOCUMENTS[vendor.detail.type].map((docType) => (
            <VendorDocumentApprovalRow
              key={docType.key}
              vendorId={vendorId}
              label={docType.label}
              required={docType.required}
              document={vendor.document?.find((doc) => doc.documentType === docType.key)}
            />
          ))}
        </div>
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
