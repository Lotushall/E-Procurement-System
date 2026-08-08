"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { VendorProfile } from "@/lib/vendor/profile/types";
import { useVendorProfile } from "@/lib/vendor/profile/queries/useVendorProfile";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const StatusBadge = () => {

    const { data: vendor, isLoading } = useVendorProfile()

    const VENDER_STATUS_TYPE: Record<VendorProfile["verificationStatus"], { label: string; badge: string; dot: string }> = {
        pending: {
            label: "กำลังดำเนินการ",
            badge: "text-yellow-600 bg-yellow-400/15",
            dot: "bg-yellow-600",
        },
        approved: {
            label: "ขึ้นทะเบียนแล้ว",
            badge: "text-green-800 bg-green-700/15",
            dot: "bg-green-800",
        },
        rejected: {
            label: "ไม่อนุมัติ",
            badge: "text-red-600 bg-red-400/15",
            dot: "bg-red-600",
        },
    };

    if (isLoading) {
        return (
            <Skeleton className="w-25 h-8 rounded-full" />
        )
    }

    if (!vendor) {
        return null;
    }

    const status = VENDER_STATUS_TYPE[vendor.verificationStatus];

    return (
        <Badge
            variant="secondary"
            className={cn(
                "flex items-center gap-1.75 text-sm tracking-wide font-bold px-3.5 py-3 h-8",
                status.badge
            )}
        >
            <span className={cn("w-1.75 h-1.75 rounded-full", status.dot)} />
            {status.label}
        </Badge>
    )
}

const RejectRemark = () => {
    const { data: vendor } = useVendorProfile()

    if (vendor?.verificationStatus !== "rejected" || !vendor.remark) {
        return null;
    }

    return <p className="wrap-break-word text-xs text-red-600">เหตุผล: {vendor.remark}</p>;
}

export default function Navbar() {
    return (
        <div className="flex flex-col gap-3.5">
            <Link href={routes.home} className="flex items-center gap-1.5 text-gray-600">
                <ChevronLeft size={17} />
                <p className="font-semibold">กลับสู่หน้าหลัก</p>
            </Link>

            <div className="flex flex-col">
                <div className="flex justify-between items-center">
                    <h1 className="text-[26px] font-bold">ข้อมูลผู้ค้า</h1>
                    <StatusBadge />
                </div>

                <p className="text-sm tracking-wide text-gray-600">จัดการข้อมูลบริษัท ผู้ติดต่อ และเอกสารประกอบสำหรับการขึ้นทะเบียน</p>
                <RejectRemark />
            </div>
        </div>
    )
}
