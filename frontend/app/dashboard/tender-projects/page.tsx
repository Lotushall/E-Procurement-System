"use client";

import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { Suspense, useState } from "react";
import { SearchInput } from "@/components/search-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    TenderProjectStatsCards,
    type TenderProjectStats,
} from "./_components/tender-project-stats-cards";

// ข้อมูลตัวอย่าง รอต่อ query hook จริงเมื่อ backend มี endpoint รายการโครงการ
const PLACEHOLDER_STATS: TenderProjectStats = {
    totalCount: 12,
    totalBudget: 45000000,
    inProgressCount: 5,
    completedCount: 4,
};

type TenderProjectStatusFilter = "all" | "draft" | "in_progress" | "completed" | "cancelled";

const STATUS_OPTIONS: { value: TenderProjectStatusFilter; label: string }[] = [
    { value: "all", label: "ทั้งหมด" },
    { value: "draft", label: "ร่าง" },
    { value: "in_progress", label: "กำลังดำเนินการ" },
    { value: "completed", label: "เสร็จสิ้น" },
    { value: "cancelled", label: "ยกเลิก" },
];

function TenderProjectsPageContent() {
    useBreadcrumb([{ label: "จัดการโครงการจัดซื้อจัดจ้าง" }]);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<TenderProjectStatusFilter>("all");

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">จัดการโครงการจัดซื้อจัดจ้าง</h1>
                    <p className="text-sm text-gray-600 tracking-wide">
                        ภาพรวมโครงการทั้งหมดและ TOR ที่เกี่ยวข้อง
                    </p>
                </div>
            </div>

            <TenderProjectStatsCards stats={PLACEHOLDER_STATS} />

            <div className="flex flex-col gap-3 lg:flex-row">
                <SearchInput
                    value={search}
                    onValueChange={setSearch}
                    placeholder="ค้นหาชื่อโครงการ | รหัสโครงการ"
                />

                <Select
                    items={STATUS_OPTIONS}
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as TenderProjectStatusFilter)}
                >
                    <SelectTrigger className="lg:w-44 h-10! bg-white rounded-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="bottom" alignItemWithTrigger={false}>
                        {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            asdw
        </div>
    );
}

export default function TenderProjectsPage() {
    return (
        <Suspense fallback={"loading..."}>
            <TenderProjectsPageContent />
        </Suspense>
    )
}
