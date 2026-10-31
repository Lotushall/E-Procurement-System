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
import type { TorSortValue } from "../../_hooks/use-tor-list-page";

// ครบทุกคู่ (คอลัมน์ × ทิศทาง) ที่หัวตารางบนจอ xl ตั้งได้ ค่าใน URL จึงมีตัวเลือกตรงกันเสมอ
// (ปีงบประมาณไม่มีหัวตารางของตัวเอง เรียงได้จากที่นี่เท่านั้น)
const SORT_OPTIONS: { value: TorSortValue; label: string }[] = [
    { value: "latest", label: "เพิ่มล่าสุด" },
    { value: "bidding_end_at:asc", label: "ปิดรับซอง ใกล้ → ไกล" },
    { value: "bidding_end_at:desc", label: "ปิดรับซอง ไกล → ใกล้" },
    { value: "budget_estimate:desc", label: "ราคากลาง มาก → น้อย" },
    { value: "budget_estimate:asc", label: "ราคากลาง น้อย → มาก" },
    { value: "title:asc", label: "ชื่อ TOR ก → ฮ" },
    { value: "title:desc", label: "ชื่อ TOR ฮ → ก" },
    { value: "tor_code:desc", label: "รหัส TOR ใหม่ → เก่า" },
    { value: "tor_code:asc", label: "รหัส TOR เก่า → ใหม่" },
    { value: "fiscal_year:desc", label: "ปีงบประมาณ ใหม่ → เก่า" },
    { value: "fiscal_year:asc", label: "ปีงบประมาณ เก่า → ใหม่" },
];

// การ์ดบนจอเล็กกว่า xl ไม่มีหัวตารางให้กด sort จึงเลือกลำดับจากตัวกรองแทน
export function TorSortSelect({
    value,
    onValueChange,
    className,
}: {
    value: TorSortValue;
    onValueChange: (value: TorSortValue) => void;
    className?: string;
}) {
    return (
        <Select
            items={SORT_OPTIONS}
            value={value}
            onValueChange={(next) => onValueChange((next ?? "latest") as TorSortValue)}
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
