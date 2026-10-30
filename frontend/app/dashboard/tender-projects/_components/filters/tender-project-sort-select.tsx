"use client"

import { ArrowUpDown } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TenderProjectSortValue } from "../../_hooks/use-tender-project-list-page";

// ครบทุกคู่ (คอลัมน์ × ทิศทาง) ที่หัวตารางบนจอ xl ตั้งได้ ค่าใน URL จึงมีตัวเลือกตรงกันเสมอ
const SORT_OPTIONS: { value: TenderProjectSortValue; label: string }[] = [
    { value: "latest", label: "เพิ่มล่าสุด" },
    { value: "budget:desc", label: "งบประมาณ มาก → น้อย" },
    { value: "budget:asc", label: "งบประมาณ น้อย → มาก" },
    { value: "name:asc", label: "ชื่อโครงการ ก → ฮ" },
    { value: "name:desc", label: "ชื่อโครงการ ฮ → ก" },
    { value: "project_code:desc", label: "รหัสโครงการ ใหม่ → เก่า" },
    { value: "project_code:asc", label: "รหัสโครงการ เก่า → ใหม่" },
];

// การ์ดบนจอเล็กกว่า xl ไม่มีหัวตารางให้กด sort จึงเลือกลำดับจากตัวกรองแทน
export function TenderProjectSortSelect({
    value,
    onValueChange,
    className,
}: {
    value: TenderProjectSortValue;
    onValueChange: (value: TenderProjectSortValue) => void;
    className?: string;
}) {
    return (
        <Select
            items={SORT_OPTIONS}
            value={value}
            onValueChange={(next) => onValueChange((next ?? "latest") as TenderProjectSortValue)}
        >
            <SelectTrigger aria-label="เรียงตาม" className={cn("w-full h-10! bg-white rounded-sm", className)}>
                <ArrowUpDown className="size-4 shrink-0 text-gray-500" aria-hidden="true" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent side="bottom" alignItemWithTrigger={false}>
                {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
