"use client";

import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatBudgetDisplay } from "@/lib/form/budget-input";
import { useDepartmentOptions } from "@/lib/internal-profiles/queries/useDepartmentOptions";
import { useTenderProjectOptions } from "@/lib/tender/tender-projects/queries/useTenderProjectOptions";
import { useTorNextCode } from "@/lib/tender/tor/queries/useTorNextCode";
import type { CreateTorFormValues } from "../_hooks/use-create-tor-form";

const formatDateTime = (value: string) => format(new Date(value), "d MMM yyyy HH:mm", { locale: th });

function biddingPeriodLabel(start?: string, end?: string): string {
    if (!start && !end) return "ยังไม่กำหนด";
    return `${start ? formatDateTime(start) : "..."} – ${end ? formatDateTime(end) : "..."}`;
}

// สรุปค่าที่กรอกแบบสด — query ของหน่วยงาน/โครงการใช้ key เดียวกับในฟอร์ม จึงได้จาก cache
export function TorSummaryCard({ actions }: { actions: ReactNode }) {
    const { control } = useFormContext<CreateTorFormValues>();
    const [title, departmentId, tenderProjectId, budgetEstimate, fiscalYear, procurementMethod, biddingStartAt, biddingEndAt] =
        useWatch({
            control,
            name: [
                "title", "departmentId", "tenderProjectId", "budgetEstimate",
                "fiscalYear", "procurementMethod", "biddingStartAt", "biddingEndAt",
            ],
        });

    const { data: nextCode } = useTorNextCode();
    const { data: departmentOptions } = useDepartmentOptions();
    const { data: projectOptions } = useTenderProjectOptions(
        { department_id: Number(departmentId), open_for_tor: true },
        { enabled: !!departmentId },
    );

    const department = departmentOptions?.find((d) => String(d.id) === departmentId);
    const project = projectOptions?.find((p) => String(p.id) === tenderProjectId);

    const rows: [string, string][] = [
        ["หน่วยงาน", department?.name ?? "-"],
        ["โครงการ", project ? `${project.projectCode} · ${project.name}` : "ไม่สังกัดโครงการ"],
        ["ราคากลาง", budgetEstimate ? `${formatBudgetDisplay(budgetEstimate)} บาท` : "-"],
        ["ปีงบประมาณ", fiscalYear || "-"],
        ["วิธีจัดซื้อ", procurementMethod || "-"],
        ["ช่วงรับซอง", biddingPeriodLabel(biddingStartAt, biddingEndAt)],
    ];

    return (
        <Card className="py-5 shadow-sm">
            <CardContent className="flex flex-col gap-4 px-5">
                {/* จอเล็กซ่อนส่วนสรุป (ซ้ำกับฟอร์ม) เหลือแค่ปุ่ม */}
                <div className="flex flex-col gap-4 max-lg:hidden">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            {/* เลขที่แสดงเป็นแค่ตัวอย่างเลขถัดไป — เลขจริงออกตอนบันทึก */}
                            <span className="text-xs font-medium text-red-700">
                                {nextCode ?? "TOR-XXXX"} (ออกอัตโนมัติ)
                            </span>
                            <Badge variant="secondary">ร่าง</Badge>
                        </div>
                        <p className={title ? "text-lg font-semibold text-gray-900" : "text-lg font-semibold text-gray-400"}>
                            {title || "ยังไม่ระบุชื่อ TOR"}
                        </p>
                    </div>

                    <Separator />

                    <dl className="flex flex-col gap-3 text-sm">
                        {rows.map(([label, value]) => (
                            <div key={label} className="flex justify-between gap-3">
                                <dt className="shrink-0 text-gray-600">{label}</dt>
                                <dd className="min-w-0 text-right text-gray-900 wrap-break-word">{value}</dd>
                            </div>
                        ))}
                    </dl>

                    <Separator />
                </div>

                {actions}
            </CardContent>
        </Card>
    );
}
