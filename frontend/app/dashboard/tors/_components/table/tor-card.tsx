"use client"

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TorStatusBadge } from "@/components/tor-status-badge";
import { routes } from "@/lib/routes";
import type { Tor } from "@/lib/tender/tor/types";
import { formatCurrency } from "@/lib/utils";

// การ์ดที่ใช้แทนแถวตารางบนจอเล็กกว่า xl (ส่งเข้า DataTable ผ่าน renderMobileCard)
export function TorCard({ tor }: { tor: Tor }) {
    return (
        <article className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-col gap-2.5 p-4 pb-3.5">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-red-700 tracking-wider">{tor.torCode}</span>
                    <TorStatusBadge status={tor.status} />
                </div>

                <Link href={routes.dashboards.tors.detail(tor.id)} className="group flex flex-col gap-1">
                    <p className="text-base font-bold leading-relaxed tracking-wide group-hover:underline group-hover:underline-offset-4">
                        {tor.title}
                    </p>
                    <p className="text-xs text-gray-600 tracking-wider">{tor.department.name}</p>
                </Link>

                <div className="flex flex-col gap-0.5 pt-1">
                    <p className="text-xs text-gray-500 tracking-wider">ราคากลาง · ปี {tor.fiscalYear}</p>
                    <p className="text-xl font-bold tracking-wide">{formatCurrency(Number(tor.budgetEstimate))}</p>
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
                <span className="min-w-0 truncate">{tor.procurementMethod}</span>
                <span className="flex shrink-0 items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {tor.biddingEndAt
                        ? `ปิดรับซอง ${format(new Date(tor.biddingEndAt), "d MMM yyyy", { locale: th })}`
                        : "ยังไม่กำหนดวันปิดรับซอง"}
                </span>
            </div>
        </article>
    );
}
