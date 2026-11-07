"use client";

import Link from "next/link";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { routes } from "@/lib/routes";
import type { CreateTorFormValues } from "../_hooks/use-create-tor-form";

// ความพร้อมส่งพิจารณา ≠ เงื่อนไขบันทึกร่าง: นับช่วงรับซองด้วย (ร่างไม่บังคับ)
// ปีงบประมาณมีค่าเริ่มต้นเสมอ จึงไม่นับ
const READINESS_ITEMS = [
    { label: "ชื่อ TOR", fields: ["title"] },
    { label: "หน่วยงาน", fields: ["departmentId"] },
    { label: "ขอบเขตงาน", fields: ["scopeOfWork"] },
    { label: "ราคากลาง", fields: ["budgetEstimate"] },
    { label: "วิธีจัดซื้อ", fields: ["procurementMethod"] },
    { label: "ช่วงรับซอง", fields: ["biddingStartAt", "biddingEndAt"] },
] as const satisfies readonly { label: string; fields: readonly (keyof CreateTorFormValues)[] }[];

export function TorActionCard({ isSubmitting }: { isSubmitting: boolean }) {
    const { control } = useFormContext<CreateTorFormValues>();
    const values = useWatch({ control });

    const missing = READINESS_ITEMS.filter(({ fields }) => fields.some((field) => !values[field]?.trim()));
    const readyCount = READINESS_ITEMS.length - missing.length;

    return (
        <Card className="py-5 shadow-sm">
            <CardContent className="flex flex-col gap-4 px-5">
                <p className="text-sm font-semibold text-gray-900">การดำเนินการ</p>

                <div className="flex flex-col gap-2.5 rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700">ความพร้อมส่งพิจารณา</span>
                        <span className="text-gray-500">
                            {readyCount}/{READINESS_ITEMS.length}
                        </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                        <div
                            className="h-full rounded-full bg-red-700 transition-[width]"
                            style={{ width: `${(readyCount / READINESS_ITEMS.length) * 100}%` }}
                        />
                    </div>

                    {missing.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-gray-500">ยังขาด:</span>
                            {missing.map(({ label }) => (
                                <span key={label} className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                                    {label}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-green-700">ข้อมูลครบ พร้อมส่งพิจารณา</p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    {/* ยังไม่มี endpoint ส่งพิจารณาใน backend — span ห่อไว้ให้ tooltip ทำงานแม้ปุ่ม disabled */}
                    <Tooltip>
                        <TooltipTrigger render={<span className="block w-full" tabIndex={0} />}>
                            <Button
                                type="button"
                                disabled
                                className="h-11 w-full bg-red-700 text-white hover:bg-red-600 disabled:cursor-not-allowed"
                            >
                                ส่งพิจารณา
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>ฟีเจอร์นี้ยังไม่เปิดใช้งาน</TooltipContent>
                    </Tooltip>
                    <Button type="submit" variant="outline" disabled={isSubmitting} className="h-11 w-full">
                        บันทึกร่าง
                    </Button>
                    <Button
                        variant="outline"
                        render={<Link href={routes.dashboards.tors.index} />}
                        nativeButton={false}
                        className="h-10 w-full text-gray-600 bg-transparent"
                    >
                        ยกเลิก
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
