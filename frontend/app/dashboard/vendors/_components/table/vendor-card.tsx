"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CalendarDays, Eye, FileText, MoreVertical, Phone, Tag, Trash2 } from "lucide-react"
import type { VendorProfile } from "@/lib/vendor/profile/types"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VendorStatusBadge } from "@/components/vendor-status-badge"
import { routes } from "@/lib/routes"
import { getInitials } from "@/lib/utils"
import { DeleteVendorDialog } from "../delete-vendor-dialog"
import {
    DocumentStatusCount,
    getVendorContact,
    getVendorDisplayName,
    VENDOR_TYPE_ICON,
    VENDOR_TYPE_LABEL,
} from "./columns"

// สีเดียวกับประเภทนิติบุคคล/ร้านค้าในการ์ดผู้ใช้
const AVATAR_CLASS: Record<"company" | "individual", string> = {
    company: "bg-blue-700",
    individual: "bg-amber-700",
}

// การ์ดที่ใช้แทนแถวตารางบนจอเล็กกว่า xl (ส่งเข้า DataTable ผ่าน renderMobileCard)
export function VendorCard({ vendor }: { vendor: VendorProfile }) {
    const router = useRouter()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const type = vendor.detail.type
    const TypeIcon = VENDOR_TYPE_ICON[type]
    const displayName = getVendorDisplayName(vendor)
    const contact = getVendorContact(vendor)
    const createdAt = new Date(vendor.created_at)
    const counts = vendor.documentStatusCounts
    const documentTotal = (counts?.approved ?? 0) + (counts?.pending ?? 0) + (counts?.rejected ?? 0)

    return (
        <article className="flex flex-col gap-3.5 rounded-2xl border bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
                <Link href={routes.dashboards.vendors.detail(vendor.id)} className="group flex min-w-0 flex-1 items-center gap-3">
                    <div
                        className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold tracking-wider text-white ${AVATAR_CLASS[type]}`}
                    >
                        {getInitials(displayName)}
                    </div>
                    <span className="line-clamp-2 text-base font-bold group-hover:underline group-hover:underline-offset-4">
                        {displayName}
                    </span>
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button variant="ghost" aria-label={`ตัวเลือกของ ${displayName}`} className="-mr-2 size-10 shrink-0" />}
                    >
                        <MoreVertical className="size-4.5 text-gray-500" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => router.push(routes.dashboards.vendors.detail(vendor.id))}>
                            <Eye />
                            ดูรายละเอียด
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                            <Trash2 />
                            ลบ
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold text-gray-700">
                    <TypeIcon className="size-3.5" aria-hidden="true" />
                    {VENDOR_TYPE_LABEL[type]}
                </span>
                <VendorStatusBadge status={vendor.verificationStatus} />
            </div>

            <dl className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2 text-sm text-gray-700">
                <dt className="text-gray-500">
                    <Tag className="size-4" aria-label="หมวดสินค้า/บริการ" />
                </dt>
                <dd className="truncate">{vendor.detail.businessType || "-"}</dd>
                <dt className="text-gray-500">
                    <Phone className="size-4" aria-label="ติดต่อ" />
                </dt>
                <dd className="truncate">{contact ?? "-"}</dd>
                <dt className="text-gray-500">
                    <CalendarDays className="size-4" aria-label="วันที่สมัคร" />
                </dt>
                <dd>สมัครเมื่อ {Number.isNaN(createdAt.getTime()) ? "-" : format(createdAt, "dd-MM-yyyy")}</dd>
                <dt className="text-gray-500">
                    <FileText className="size-4" aria-label="สถานะเอกสาร" />
                </dt>
                <dd className="flex items-center gap-2.5">
                    {counts && documentTotal > 0 ? (
                        <>
                            {counts.approved > 0 && <DocumentStatusCount status="approved" count={counts.approved} />}
                            {counts.pending > 0 && <DocumentStatusCount status="pending" count={counts.pending} />}
                            {counts.rejected > 0 && <DocumentStatusCount status="rejected" count={counts.rejected} />}
                        </>
                    ) : (
                        <span className="text-muted-foreground">ยังไม่มีเอกสาร</span>
                    )}
                </dd>
            </dl>

            <DeleteVendorDialog
                vendorId={vendor.id}
                displayName={displayName}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
            />
        </article>
    )
}
