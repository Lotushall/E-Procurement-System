"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TorStatusBadge } from "@/components/tor-status-badge";
import { RequirePermission } from "@/lib/auth/guards/RequirePermission";
import { routes } from "@/lib/routes";
import { TOR_VIEW_PERMISSIONS, type TorUserSummary } from "@/lib/tender/tor/types";
import { formatCurrency } from "@/lib/utils";
import { useTorDetailPage } from "./_hooks/use-tor-detail-page";

const CARD_CLASS = "shadow-md shadow-gray-200 border-gray-200";

const formatTorDate = (value: string | null) =>
    value ? format(new Date(value), "d MMM yyyy", { locale: th }) : "-";

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold tracking-wide text-gray-500">{label}</p>
            <div className="text-base font-semibold tracking-wider">{children}</div>
        </div>
    );
}

// ผู้สร้าง / ผู้อนุมัติ: ไม่มีผู้ใช้ แสดง "-" ครั้งเดียว (ไม่มีหน่วยงานและ extra) ถ้ามีผู้ใช้ ไม่มีชื่อ (name null) หรือไม่มีหน่วยงาน แสดง "-" ในส่วนนั้น
function PersonRow({ label, person, extra }: { label: string; person: TorUserSummary | null; extra?: ReactNode }) {
    return (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
            <p className="w-28 shrink-0 text-sm font-bold tracking-wide text-gray-500">{label}</p>
            <p className="text-base tracking-wider">
                {person ? (
                    <>
                        <span className="font-semibold">{person?.name ?? "-"}</span>
                        <span className="text-gray-600"> · {person?.department?.name ?? "-"}</span>
                        {extra}
                    </>
                ) : (
                    "-"
                )}
            </p>
        </div>
    );
}

function TorDetailContent() {
    const searchParams = useSearchParams();
    const id = Number(searchParams.get("id"));

    const { tor, isValidId, isPending, notFound } = useTorDetailPage(id);

    if (isValidId && isPending) {
        return (
            <div className="flex justify-center py-12">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (notFound || !tor) {
        return (
            <p className="py-12 text-center text-sm text-muted-foreground">
                ไม่พบข้อมูล TOR นี้
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4.5">
            <Card className={CARD_CLASS}>
                <CardHeader className="flex flex-col gap-2.25">
                    <div className="flex items-center gap-2.5 h-fit">
                        <p className="text-xs font-medium text-red-700">{tor.torCode}</p>
                        <TorStatusBadge status={tor.status} />
                    </div>
                    <CardTitle className="text-2xl font-semibold">
                        {tor.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Separator className="mb-4.5" />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        <SummaryItem label="หน่วยงาน">{tor.department.name}</SummaryItem>
                        <SummaryItem label="โครงการ">
                            {tor.tenderProject ? (
                                <Link
                                    href={routes.dashboards.tender_project.detail(tor.tenderProject.id)}
                                    className="underline decoration-gray-300 underline-offset-4 hover:decoration-current"
                                >
                                    {tor.tenderProject.projectCode} · {tor.tenderProject.name}
                                </Link>
                            ) : (
                                "ไม่สังกัดโครงการ"
                            )}
                        </SummaryItem>
                        <SummaryItem label="ราคากลาง">฿{formatCurrency(Number(tor.budgetEstimate))}</SummaryItem>
                        <SummaryItem label="ปีงบประมาณ">{tor.fiscalYear}</SummaryItem>
                        <SummaryItem label="วิธีจัดซื้อจัดจ้าง">{tor.procurementMethod}</SummaryItem>
                        <SummaryItem label="เปิดรับซอง">{formatTorDate(tor.biddingStartAt)}</SummaryItem>
                        <SummaryItem label="ปิดรับซอง">{formatTorDate(tor.biddingEndAt)}</SummaryItem>
                        <SummaryItem label="วันที่สร้าง">{formatTorDate(tor.createdAt)}</SummaryItem>
                    </div>
                </CardContent>
            </Card>

            <Card className={CARD_CLASS}>
                <CardHeader>
                    <CardTitle className="font-bold">ขอบเขตงาน</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-line leading-relaxed">{tor.scopeOfWork}</p>
                </CardContent>
            </Card>

            <Card className={CARD_CLASS}>
                <CardHeader>
                    <CardTitle className="font-bold">ผู้เกี่ยวข้อง</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <PersonRow label="ผู้สร้าง" person={tor.createdBy} />
                    <PersonRow
                        label="ผู้อนุมัติ"
                        person={tor.approvedBy}
                        extra={tor.approvedAt ? <span className="text-gray-600"> · {formatTorDate(tor.approvedAt)}</span> : undefined}
                    />
                </CardContent>
            </Card>

            {tor.remark?.trim() && (
                <Card className={CARD_CLASS}>
                    <CardHeader>
                        <CardTitle className="font-bold">หมายเหตุ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="whitespace-pre-line leading-relaxed">{tor.remark}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function TorDetailPage() {
    return (
        <Suspense fallback={null}>
            <RequirePermission permissions={TOR_VIEW_PERMISSIONS}>
                <TorDetailContent />
            </RequirePermission>
        </Suspense>
    );
}
