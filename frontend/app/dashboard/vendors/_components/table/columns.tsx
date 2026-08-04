"use client"
import { format } from "date-fns";


import Link from "next/link"
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Building2,
    Eye,
    User,
    type LucideIcon,
} from "lucide-react"
import type { Column, ColumnDef } from "@tanstack/react-table"
import type { VendorProfile } from "@/lib/vendor/profile/types"
import { Button } from "@/components/ui/button"
import { VendorStatusBadge } from "@/components/vendor-status-badge"
import { routes } from "@/lib/routes"
import { cn, formatPhone, getInitials } from "@/lib/utils"

function SortableHeader({
    column,
    label,
    align = "left",
}: {
    column: Column<VendorProfile, unknown>
    label: string
    align?: "left" | "center"
}) {
    const sorted = column.getIsSorted()
    return (
        <div className={cn("flex items-center", align === "center" && "justify-center")}>
            <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => column.toggleSorting()}
            >
                {label}
                {sorted === "asc" ? (
                    <ArrowUp className="ml-1.5 size-3.5" />
                ) : sorted === "desc" ? (
                    <ArrowDown className="ml-1.5 size-3.5" />
                ) : (
                    <ArrowUpDown className="ml-1.5 size-3.5 text-muted-foreground" />
                )}
            </Button>
        </div>
    )
}

const VENDOR_TYPE_LABEL: Record<"company" | "individual", string> = {
    company: "นิติบุคคล",
    individual: "บุคคลธรรมดา",
}

const VENDOR_TYPE_ICON: Record<"company" | "individual", LucideIcon> = {
    company: Building2,
    individual: User,
}

export const columns: ColumnDef<VendorProfile>[] = [
    {
        id: "name",
        header: ({ column }) => <SortableHeader column={column} label="ผู้ค้า" />,
        accessorFn: (vendor) => vendor.detail.type === "company" ? vendor.detail.companyName : vendor.detail.storeName,
        cell: ({ getValue }) => (
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8.5 rounded-md bg-red-700 text-white text-xs font-bold tracking-wider">
                    {getInitials(getValue<string>())}
                </div>
                <span className="font-bold ">{getValue<string>()}</span>
            </div>
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
            const vendor = row.original
            const mainContact = vendor.contact?.find((c) => c.isMainContact) ?? vendor.contact?.[0]
            if (mainContact) {
                return <span>{formatPhone(mainContact.contactPhone) || mainContact.contactEmail}</span>
            }
            if (vendor.detail.type === "individual") {
                return <span>{formatPhone(vendor.detail.phone) || vendor.detail.email}</span>
            }
            return <span className="text-muted-foreground">-</span>
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
        id: "actions",
        header: () => <div className="text-center mx-auto">Actions</div>,
        enableHiding: false,
        cell: ({ row }) => (
            <div className="flex justify-center">
                <Button
                    variant="outline"
                    render={<Link href={routes.dashboards.vendors.detail(row.original.id)} />}
                    className="size-8 px-1.5 pt-px rounded-md bg-white"
                >
                    <Eye className="w-4 h-4 text-gray-500" />
                </Button>
            </div>
        ),
    },
]
