"use client";

import { CheckIcon, CircleIcon } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import type { CreateTorFormValues } from "../_hooks/use-create-tor-form";

// เฉพาะช่องบังคับ — ช่วงรับซองกับโครงการไม่นับ
const REQUIRED_FIELDS = [
    ["title", "ชื่อ TOR"],
    ["departmentId", "หน่วยงาน"],
    ["budgetEstimate", "ราคากลาง"],
    ["fiscalYear", "ปีงบประมาณ"],
    ["procurementMethod", "วิธีจัดซื้อจัดจ้าง"],
    ["scopeOfWork", "ขอบเขตงาน"],
] as const satisfies readonly (readonly [keyof CreateTorFormValues, string])[];

export function CompletenessCard() {
    const { control } = useFormContext<CreateTorFormValues>();
    const values = useWatch({ control, name: REQUIRED_FIELDS.map(([name]) => name) });

    const filled = values.map((value) => !!value?.trim());
    const filledCount = filled.filter(Boolean).length;

    return (
        <Card className="py-5 shadow-sm">
            <CardContent className="flex flex-col gap-4 px-5">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">ความครบถ้วน</p>
                    <p className="text-sm text-gray-500">
                        {filledCount}/{REQUIRED_FIELDS.length}
                    </p>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                        className="h-full rounded-full bg-red-700 transition-[width]"
                        style={{ width: `${(filledCount / REQUIRED_FIELDS.length) * 100}%` }}
                    />
                </div>

                <ul className="flex flex-col gap-2.5 text-sm">
                    {REQUIRED_FIELDS.map(([name, label], i) => (
                        <li key={name} className="flex items-center gap-2.5">
                            {filled[i] ? (
                                <CheckIcon className="size-4 text-green-600" />
                            ) : (
                                <CircleIcon className="size-4 text-gray-400" />
                            )}
                            <span className={filled[i] ? "text-gray-900" : "text-gray-600"}>{label}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
