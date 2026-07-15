"use client";

import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Building2, FileText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menus = [
    {
        icon: <Building2 size={18} />,
        label: "ข้อมูลบริษัท",
        href: routes.profiles.profile,
    },
    {
        icon: <Users size={18} />,
        label: "ผู้ติดต่อ",
        href: routes.profiles.contract,
    },
    {
        icon: <FileText size={18} />,
        label: "เอกสารประกอบ",
        href: routes.profiles.document,
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col gap-0.5 bg-white border border-gray-200 shadow rounded-md p-2 max-w-58 w-full">
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
                        {menu.icon}
                        <p className="text-sm font-semibold tracking-wider">{menu.label}</p>
                    </Link>
                )
            })}
        </div>
    )
}
