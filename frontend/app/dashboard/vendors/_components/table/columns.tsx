"use client"
import { format } from "date-fns";


import Link from "next/link"
import {
    Building2,
    CircleCheck,
    CircleX,
    Clock,
    Trash2,
    User,
    type LucideIcon,
} from "lucide-react"
import { DeleteVendorDialog } from "../delete-vendor-dialog"
import type { ColumnDef } from "@tanstack/react-table"
import type { VendorProfile } from "@/lib/vendor/profile/types"
import { Button } from "@/components/ui/button"
import { SortableHeader } from "@/components/ui/data-table-sortable-header"
import { VendorStatusBadge } from "@/components/vendor-status-badge"
import { routes } from "@/lib/routes"
import { cn, formatPhone, getInitials } from "@/lib/utils"

// ใช้ร่วมกับ vendor-card.tsx
export const VENDOR_TYPE_LABEL: Record<"company" | "individual", string> = {
    company: "นิติบุคคล",
    individual: "บุคคลธรรมดา",
}

export const VENDOR_TYPE_ICON: Record<"company" | "individual", LucideIcon> = {
    company: Building2,
    individual: User,
}

export function getVendorDisplayName(vendor: VendorProfile): string {
    return vendor.detail.type === "company" ? vendor.detail.companyName : vendor.detail.storeName
}

// เบอร์/อีเมลของผู้ติดต่อหลัก (หรือคนแรก); บุคคลธรรมดาที่ไม่มีผู้ติดต่อใช้ข้อมูลของตัวเอง
export function getVendorContact(vendor: VendorProfile): string | null {
    const mainContact = vendor.contact?.find((c) => c.isMainContact) ?? vendor.contact?.[0]
    if (mainContact) return formatPhone(mainContact.contactPhone) || mainContact.contactEmail || null
    if (vendor.detail.type === "individual") return formatPhone(vendor.detail.phone) || vendor.detail.email || null
    return null
}

const DOCUMENT_STATUS_ICON: Record<"approved" | "pending" | "rejected", LucideIcon> = {
    approved: CircleCheck,
    pending: Clock,
    rejected: CircleX,
}

const DOCUMENT_STATUS_COLOR: Record<"approved" | "pending" | "rejected", string> = {
    approved: "text-green-800",
    pending: "text-yellow-600",
    rejected: "text-red-600",
}

const DOCUMENT_STATUS_LABEL: Record<"approved" | "pending" | "rejected", string> = {
    approved: "อนุมัติแล้ว",
    pending: "รอตรวจสอบ",
    rejected: "ถูกปฏิเสธ",
}

export function DocumentStatusCount({
    status,
    count,
}: {
    status: "approved" | "pending" | "rejected"
    count: number
}) {
    const Icon = DOCUMENT_STATUS_ICON[status]
    return (
        <span
            className="flex items-center gap-1 text-xs font-medium text-gray-700"
            aria-label={`${DOCUMENT_STATUS_LABEL[status]} ${count} ฉบับ`}
        >
            <Icon className={cn("size-3.5", DOCUMENT_STATUS_COLOR[status])} aria-hidden="true" />
            {count}
        </span>
    )
}

export const columns: ColumnDef<VendorProfile>[] = [
    {
        id: "name",
        header: ({ column }) => <SortableHeader column={column} label="ผู้ค้า" />,
        accessorFn: getVendorDisplayName,
        // ช่องผู้ค้าเป็นลิงก์ไปหน้า detail แทนปุ่มดูรายละเอียดในคอลัมน์ Actions
        cell: ({ getValue, row }) => (
            <Link
                href={routes.dashboards.vendors.detail(row.original.id)}
                className="group flex items-center gap-3"
            >
                <div className="flex items-center justify-center size-8.5 rounded-md bg-red-700 text-white text-xs font-bold tracking-wider">
                    {getInitials(getValue<string>())}
                </div>
                <span className="font-bold underline decoration-gray-300 underline-offset-4 group-hover:decoration-current">{getValue<string>()}</span>
            </Link>
        ),
    },
    {
        id: "user_type",
        header: ({ column }) => <SortableHeader column={column} label="ประเภท" />,
        accessorFn: (vendor) => vendor.detail.type,
        cell: ({ getValue }) => {
            const type = getValue<"company" | "individual">()
            const Icon = VENDOR_TYPE_ICON[type]
            return (
                <div className="flex items-center gap-1.5 text-gray-700">
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{VENDOR_TYPE_LABEL[type]}</span>
                </div>
            )
        },
    },
    {
        id: "business_type",
        header: ({ column }) => <SortableHeader column={column} label="หมวดสินค้า/บริการ" />,
        accessorFn: (vendor) => vendor.detail.businessType,
        cell: ({ getValue }) => getValue<string | null>() || "-",
    },
    {
        id: "contact",
        header: "ติดต่อ",
        cell: ({ row }) => {
            const contact = getVendorContact(row.original)
            return contact ? <span>{contact}</span> : <span className="text-muted-foreground">-</span>
        },
    },
    {
        id: "created_at",
        header: ({ column }) => <SortableHeader column={column} label="วันที่สมัคร" align="center" />,
        accessorFn: (vendor) => vendor.created_at,
        cell: ({ getValue }) => <div className="text-center">
            {format(new Date(getValue<string>()), "dd-MM-yyyy")}
        </div>,
    },
    {
        id: "verification_status",
        header: () => <div className="text-center">สถานะ</div>,
        enableSorting: false,
        accessorFn: (vendor) => vendor.verificationStatus,
        cell: ({ getValue }) => (
            <div className="flex justify-center">
                <VendorStatusBadge status={getValue<string>()} />
            </div>
        ),
    },
    {
        id: "document_status",
        header: () => <div className="text-center">สถานะเอกสาร</div>,
        enableSorting: false,
        accessorFn: (vendor) => vendor.documentStatusCounts,
        cell: ({ getValue }) => {
            const counts = getValue<VendorProfile["documentStatusCounts"]>()
            const total = (counts?.approved ?? 0) + (counts?.pending ?? 0) + (counts?.rejected ?? 0)

            if (!counts || total === 0) {
                return <div className="flex justify-center text-muted-foreground">-</div>
            }

            return (
                <div className="flex justify-center gap-2.5">
                    {counts.approved > 0 && <DocumentStatusCount status="approved" count={counts.approved} />}
                    {counts.pending > 0 && <DocumentStatusCount status="pending" count={counts.pending} />}
                    {counts.rejected > 0 && <DocumentStatusCount status="rejected" count={counts.rejected} />}
                </div>
            )
        },
    },
    {
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-center gap-1.5">
                <DeleteVendorDialog
                    vendorId={row.original.id}
                    displayName={getVendorDisplayName(row.original)}
                    trigger={
                        <Button
                            variant="outline"
                            aria-label="ลบผู้ค้า"
                            className="size-8 px-1.5 pt-px rounded-md bg-white"
                        />
                    }
                    triggerChildren={<Trash2 className="w-4 h-4 text-red-600" />}
                />
            </div>
        ),
    },
]
