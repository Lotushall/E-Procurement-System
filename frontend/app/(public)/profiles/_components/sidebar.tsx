"use client";

import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useVendorProfile } from "@/lib/vendor/useVendorProfile";
import { REQUIRED_DOCUMENTS } from "../data/document-types";
import { Building2, CircleUserRound, FileText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname();
    const { data: vendor, isPending } = useVendorProfile();

    const hasIncompleteAddress =
        !isPending &&
        (
            !vendor ||
            !vendor.detail.address ||
            !vendor.detail.country ||
            !vendor.detail.province ||
            !vendor.detail.postalCode
        );

    const hasIncompleteContact =
        !isPending &&
        (
            !vendor ||
            !vendor.contact ||
            vendor.contact.length === 0 ||
            !vendor.contact?.[0]?.contactName ||
            !vendor.contact?.[0]?.contactEmail ||
            !vendor.contact?.[0]?.contactPhone
        );

    const hasIncompleteDocument =
        !isPending &&
        (
            !vendor ||
            REQUIRED_DOCUMENTS[vendor.detail.type]
                .filter((doc) => doc.required)
                .some((doc) => !vendor.document?.some((d) => d.documentType === doc.key))
        );

    const menus = [
        {
            icon: <CircleUserRound size={18} />,
            label: "บัญชี",
            href: routes.profiles.profile,
        },
        {
            icon: <Building2 size={18} />,
            label: "ข้อมูลบริษัท",
            href: routes.profiles.vendorInfo,
            hasWarning: hasIncompleteAddress,
        },
        {
            icon: <Users size={18} />,
            label: "ผู้ติดต่อ",
            href: routes.profiles.contract,
            hasWarning: hasIncompleteContact,
        },
        {
            icon: <FileText size={18} />,
            label: "เอกสารประกอบ",
            href: routes.profiles.document,
            hasWarning: hasIncompleteDocument,
        },
    ];

    return (
        <div className="flex flex-row flex-wrap md:flex-nowrap lg:flex-col gap-0.5 bg-white border border-gray-200 shadow rounded-md p-2 lg:max-w-58 w-fit lg:w-full h-fit">
            {menus.map((menu, index) => {
                const isActive = pathname === menu.href;
                return (
                    <Link
                        href={menu.href}
                        key={index}
                        className={cn(
                            "flex items-center justify-start gap-2.5 px-3.5 py-2.5 rounded-md",
                            isActive && "text-red-700 bg-red-100",
                        )}
                    >
                        <span className="relative">
                            {menu.icon}
                            {menu.hasWarning && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.75 h-1.75 rounded-full bg-red-600" />
                            )}
                        </span>
                        <p className="text-sm font-semibold tracking-wider">{menu.label}</p>
                    </Link>
                )
            })}
        </div>
    )
}
