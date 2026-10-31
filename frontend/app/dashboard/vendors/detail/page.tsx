"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreVertical, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [deleteOpen, setDeleteOpen] = useState(false);

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
    <div className="flex flex-col gap-6 pb-10">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        {/* จอเล็กกว่า sm: การ์ดโปรไฟล์จัดกลาง — ปุ่มลบอยู่ในเมนู ⋮, เหตุผลที่ปฏิเสธอยู่แถบล่างของการ์ด */}
        <article className="relative overflow-hidden rounded-2xl border bg-white sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" aria-label="ตัวเลือกเพิ่มเติม" className="absolute top-1.5 right-1 size-11" />}
            >
              <MoreVertical className="size-4.5 text-gray-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                variant="destructive"
                disabled={isVendorActionPending}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
                ลบผู้ค้า
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-col items-center gap-2.5 px-5 pt-6 pb-4.5 text-center">
            <div className="flex size-16 items-center justify-center rounded-xl bg-red-700 text-xl font-bold text-white">
              {getInitials(displayName ?? "")}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h1 className="text-xl font-bold wrap-anywhere">{displayName}</h1>
              <p className="text-sm text-muted-foreground wrap-anywhere">{vendor.user?.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <VendorStatusBadge status={vendor.verificationStatus} />
              {vendor.user?.id && (
                <Link href={routes.dashboards.user.detail(vendor.user.id)} className="text-[13px] text-red-700 hover:underline">
                  ดูบัญชีผู้ใช้
                </Link>
              )}
            </div>
          </div>

          {vendor.verificationStatus === "rejected" && vendor.remark && (
            <div className="flex flex-col gap-0.5 border-t px-5 py-3">
              <span className="text-xs text-muted-foreground">เหตุผลที่ปฏิเสธ</span>
              <span className="wrap-break-word text-sm text-red-700">{vendor.remark}</span>
            </div>
          )}
        </article>

        {/* sm ขึ้นไป: ส่วนหัวแถวเดียว */}
        <div className="hidden min-w-0 items-center gap-3.5 sm:flex">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-bold text-white">
            {getInitials(displayName ?? "")}
          </div>

          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-2xl font-bold wrap-anywhere">{displayName}</h1>
            <p className="text-sm text-muted-foreground wrap-anywhere">
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

          <div className="flex flex-col items-start gap-1">
            <VendorStatusBadge status={vendor.verificationStatus} />
            {vendor.verificationStatus === "rejected" && vendor.remark ? (
              <p className="max-w-60 wrap-break-word text-sm text-red-600">เหตุผล: {vendor.remark}</p>
            ) : (
              <div className="h-4" />
            )}
          </div>
        </div>

        {/* Action Buttons — จอเล็กกว่า sm เป็นแถบติดล่างจอ (data-bottom-bar: layout เว้นที่ให้) */}
        <div
          data-bottom-bar=""
          className="grid grid-cols-2 gap-2 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:border-t max-sm:bg-white max-sm:px-4 max-sm:pt-3 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex sm:items-center"
        >

          {vendor.verificationStatus !== "pending" && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePending}
              disabled={isVendorActionPending}
              className="max-sm:h-10"
            >
              {pendingVendor.isPending ? "กำลังดำเนินการ..." : "รอตรวจสอบ"}
            </Button>
          )}

          {vendor.verificationStatus !== "approved" && (
            <Button type="button" onClick={handleApprove} disabled={isVendorActionPending} className="max-sm:h-10">
              {approveVendor.isPending ? "กำลังดำเนินการ..." : "อนุมัติผู้ค้า"}
            </Button>
          )}

          {vendor.verificationStatus !== "rejected" && (
            <RejectReasonDialog
              trigger={
                <Button type="button" variant="destructive" disabled={isVendorActionPending} className="max-sm:h-10" />
              }
              triggerChildren={rejectVendor.isPending ? "กำลังดำเนินการ..." : "ปฏิเสธผู้ค้า"}
              title="ปฏิเสธผู้ค้า"
              description={`ระบุเหตุผลที่ปฏิเสธ "${displayName}"`}
              isPending={rejectVendor.isPending}
              onConfirm={handleReject}
            />
          )}

          <Button
            type="button"
            variant="destructive"
            className="hidden sm:inline-flex"
            disabled={isVendorActionPending}
            onClick={() => setDeleteOpen(true)}
          >
            ลบผู้ค้า
          </Button>

          <DeleteVendorDialog
            vendorId={vendorId}
            displayName={displayName ?? ""}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
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
                  <div key={contact.id} className="flex items-center gap-3.5 rounded-md border bg-white p-4">
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
                        {contact.contactEmail && <p className="wrap-anywhere"> · {contact.contactEmail}</p>}
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
