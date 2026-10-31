"use client"

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TorStatusBadge } from "@/components/tor-status-badge";
import { SortableHeader } from "@/components/ui/data-table-sortable-header";
import { routes } from "@/lib/routes";
import type { Tor } from "@/lib/tender/tor/types";
import { formatCurrency } from "@/lib/utils";

const HEADER_TEXT_CLASS = "text-sm font-bold text-gray-500";
// ตัด padding/negative margin ของปุ่ม ghost ออก ให้หัวที่ sort ได้กว้างแค่ข้อความ + ไอคอน ไม่ดันตารางจน overflow
const SORTABLE_HEADER_CLASS = `${HEADER_TEXT_CLASS} mx-0 px-0 hover:bg-transparent`;

function ColumnHeader({ label, align }: { label: string; align?: "left" | "center" | "right" }) {
    return <p className={`${HEADER_TEXT_CLASS} ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}>{label}</p>;
}

// id ของคอลัมน์ที่ sort ได้ต้องตรงกับ SORT_BY_VALUES ใน use-tor-list-page.ts
export const torColumns: ColumnDef<Tor>[] = [
    {
        id: "tor_code",
        header: ({ column }) => <SortableHeader column={column} label="รหัส TOR" className={SORTABLE_HEADER_CLASS} />,
        accessorFn: (tor) => tor.torCode,
        // รหัสและชื่อ TOR เป็นลิงก์ไปหน้า detail (ไม่มีคอลัมน์ Actions)
        cell: ({ getValue, row }) => (
            <Link
                href={routes.dashboards.tors.detail(row.original.id)}
                className="text-xs text-red-700 font-semibold underline decoration-red-700/30 underline-offset-4 hover:decoration-red-700"
            >
                {getValue<string>()}
            </Link>
        ),
    },
    {
        id: "title",
        header: ({ column }) => <SortableHeader column={column} label="TOR / หน่วยงาน" className={SORTABLE_HEADER_CLASS} />,
        accessorFn: (tor) => tor.title,
        cell: ({ getValue, row }) => (
            <Link
                href={routes.dashboards.tors.detail(row.original.id)}
                className="group flex flex-col"
            >
                <p className="text-sm font-semibold tracking-wider leading-6 underline decoration-gray-300 underline-offset-4 group-hover:decoration-current">{getValue<string>()}</p>
                <p className="text-xs text-gray-600 tracking-wider">{row.original.department.name}</p>
            </Link>
        ),
    },
    {
        id: "tender_project",
        header: () => <ColumnHeader label="โครงการ" />,
        accessorFn: (tor) => tor.tenderProject?.projectCode ?? "-",
        cell: ({ row }) => {
            const project = row.original.tenderProject;
            return project ? (
                <Link
                    href={routes.dashboards.tender_project.detail(project.id)}
                    title={project.name}
                    className="text-xs font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 hover:decoration-current"
                >
                    {project.projectCode}
                </Link>
            ) : (
                <p className="text-sm text-gray-500">-</p>
            );
        },
    },
    {
        id: "procurement_method",
        header: () => <ColumnHeader label="วิธีจัดซื้อจัดจ้าง" />,
        accessorFn: (tor) => tor.procurementMethod,
        cell: ({ getValue }) => (
            <p className="text-sm text-gray-600 tracking-wider">{getValue<string>()}</p>
        ),
    },
    {
        id: "budget_estimate",
        header: ({ column }) => <SortableHeader column={column} label="ราคากลาง" align="right" className={SORTABLE_HEADER_CLASS} />,
        accessorFn: (tor) => tor.budgetEstimate,
        cell: ({ getValue, row }) => (
            <div className="flex flex-col items-end">
                <p className="text-sm font-normal tracking-wider">ปีงบประมาณ {row.original.fiscalYear}</p>
                <p className="text-sm font-bold text-right">{formatCurrency(Number(getValue<string>()))}</p>
            </div>
        ),
    },
    {
        id: "bidding_end_at",
        header: ({ column }) => <SortableHeader column={column} label="ปิดรับซอง" className={SORTABLE_HEADER_CLASS} />,
        accessorFn: (tor) => tor.biddingEndAt,
        cell: ({ getValue }) => {
            const value = getValue<string | null>();
            return (
                <p className="text-sm">
                    {value ? format(new Date(value), "d MMM yyyy", { locale: th }) : "-"}
                </p>
            );
        },
    },
    {
        id: "status",
        header: () => <ColumnHeader label="สถานะ" align="center" />,
        accessorFn: (tor) => tor.status,
        cell: ({ row }) => (
            <div className="flex justify-center">
                <TorStatusBadge status={row.original.status} />
            </div>
        ),
    },
];
