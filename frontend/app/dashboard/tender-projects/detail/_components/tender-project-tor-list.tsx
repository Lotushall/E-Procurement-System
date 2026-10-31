"use client"

import Link from "next/link";
import { TorBiddingWindow } from "@/components/tor-bidding-window";
import { TorStatusBadge } from "@/components/tor-status-badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/routes";
import type { TenderProjectTor } from "@/lib/tender/tender-projects/types";
import { formatCurrency } from "@/lib/utils";

// รายการ TOR ใต้โครงการ — ไม่มี sort/pagination เพราะ backend ส่งมาครบในครั้งเดียว
export function TenderProjectTorList({ tors }: { tors: TenderProjectTor[] }) {
    if (tors.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                ยังไม่มี TOR ภายใต้โครงการนี้
            </p>
        );
    }

    return (
        <>
            {/* จอเล็ก: แสดงเป็นรายการแทนตาราง */}
            <ul className="flex flex-col divide-y rounded-xl border md:hidden">
                {tors.map((tor) => (
                    <li key={tor.id} className="flex flex-col gap-1.5 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-red-700 tracking-wider">{tor.torCode}</span>
                            <TorStatusBadge status={tor.status} />
                        </div>
                        <Link
                            href={routes.dashboards.tors.detail(tor.id)}
                            className="text-sm font-semibold tracking-wider leading-6 underline decoration-gray-300 underline-offset-4 hover:decoration-current"
                        >
                            {tor.title}
                        </Link>
                        <p className="text-xs text-gray-600 tracking-wider">{tor.procurementMethod}</p>
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(Number(tor.budgetEstimate))}</span>
                            <TorBiddingWindow
                                status={tor.status}
                                biddingStartAt={tor.biddingStartAt}
                                biddingEndAt={tor.biddingEndAt}
                                className="items-end text-right"
                            />
                        </div>
                    </li>
                ))}
            </ul>

            <div className="hidden overflow-hidden rounded-xl border md:block">
                <Table>
                    <TableHeader className="bg-[#F7F8FA]">
                        <TableRow>
                            <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide">รหัส TOR</TableHead>
                            <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide">ชื่อ TOR</TableHead>
                            <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide">วิธีจัดซื้อจัดจ้าง</TableHead>
                            <TableHead className="px-4 py-3 text-right font-bold text-gray-600 tracking-wide">ราคากลาง</TableHead>
                            <TableHead className="px-4 py-3 font-bold text-gray-600 tracking-wide">ช่วงรับซอง</TableHead>
                            <TableHead className="px-4 py-3 text-center font-bold text-gray-600 tracking-wide">สถานะ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tors.map((tor) => (
                            <TableRow key={tor.id} className="even:bg-[#F7F8FA] odd:bg-white">
                                <TableCell className="px-4 py-3">
                                    <Link
                                        href={routes.dashboards.tors.detail(tor.id)}
                                        className="text-xs text-red-700 font-semibold underline decoration-red-700/30 underline-offset-4 hover:decoration-red-700"
                                    >
                                        {tor.torCode}
                                    </Link>
                                </TableCell>
                                <TableCell className="px-4 py-3 whitespace-normal">
                                    <Link
                                        href={routes.dashboards.tors.detail(tor.id)}
                                        className="text-sm font-semibold tracking-wider leading-6 underline decoration-gray-300 underline-offset-4 hover:decoration-current"
                                    >
                                        {tor.title}
                                    </Link>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-sm text-gray-600 tracking-wider">{tor.procurementMethod}</TableCell>
                                <TableCell className="px-4 py-3 text-right text-sm font-bold">{formatCurrency(Number(tor.budgetEstimate))}</TableCell>
                                <TableCell className="px-4 py-3">
                                    <TorBiddingWindow
                                        status={tor.status}
                                        biddingStartAt={tor.biddingStartAt}
                                        biddingEndAt={tor.biddingEndAt}
                                    />
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                    <div className="flex justify-center">
                                        <TorStatusBadge status={tor.status} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
