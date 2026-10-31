import { TriangleAlert } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// ยอดจัดสรรเทียบกับงบประมาณโครงการ (ดู CONTEXT.md) — เกินงบแสดงตามจริงพร้อมเตือน ไม่บล็อก
function getAllocation(budget: string, allocatedBudget: string) {
    const budgetValue = Number(budget);
    const allocated = Number(allocatedBudget);

    return {
        budgetValue,
        allocated,
        remaining: budgetValue - allocated,
        percent: budgetValue > 0 ? (allocated / budgetValue) * 100 : null,
        isOverBudget: allocated > budgetValue,
    };
}

export const isAllocationOverBudget = (budget: string, allocatedBudget: string) =>
    getAllocation(budget, allocatedBudget).isOverBudget;

const formatPercent = (value: number) =>
    `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value)}%`;

const OVER_BUDGET_STRIPES = "repeating-linear-gradient(45deg, #dc2626 0 3px, #fca5a5 3px 6px)";

// ไม่เกินงบ: แถบยาวเท่างบ · เกินงบ: แถบยาวถึงยอดจัดสรร แล้วขีดเส้นงบไว้ตรง 100% ส่วนที่เกินเป็นลายแดง
function AllocationBar({
    budgetValue,
    allocated,
    percent,
    className,
}: {
    budgetValue: number;
    allocated: number;
    percent: number | null;
    className?: string;
}) {
    const scale = Math.max(budgetValue, allocated);
    const toWidth = (value: number) => (scale > 0 ? `${(value / scale) * 100}%` : "0%");
    const isOverBudget = allocated > budgetValue;

    return (
        <div
            role="img"
            aria-label={percent === null ? "ยังไม่ได้จัดสรร" : `จัดสรร ${formatPercent(percent)} ของงบประมาณ`}
            className="relative py-0.75"
        >
            <div className={cn("relative h-1.5 overflow-hidden rounded-full bg-gray-200", className)}>
                <div
                    className="absolute inset-y-0 left-0 bg-blue-300"
                    style={{ width: toWidth(Math.min(allocated, budgetValue)) }}
                />
                {isOverBudget && (
                    <div
                        className="absolute inset-y-0"
                        style={{ left: toWidth(budgetValue), right: 0, backgroundImage: OVER_BUDGET_STRIPES }}
                    />
                )}
            </div>
            {isOverBudget && (
                <div
                    className="absolute inset-y-0 -ml-px w-0.5 bg-gray-900"
                    style={{ left: toWidth(budgetValue) }}
                />
            )}
        </div>
    );
}

export function TenderProjectBudgetAllocation({
    budget,
    allocatedBudget,
    variant = "compact",
}: {
    budget: string;
    allocatedBudget: string;
    variant?: "compact" | "full";
}) {
    const { budgetValue, allocated, remaining, percent, isOverBudget } = getAllocation(budget, allocatedBudget);
    const percentText = percent === null ? "-" : formatPercent(percent);

    if (variant === "compact") {
        return (
            <div className="flex w-full min-w-40 flex-col gap-1.5">
                <AllocationBar budgetValue={budgetValue} allocated={allocated} percent={percent} />
                {isOverBudget ? (
                    <div className="flex justify-between gap-2 text-xs font-semibold text-red-800">
                        <span className="flex items-center gap-1">
                            <TriangleAlert className="size-3.5" aria-hidden="true" />
                            จัดสรรเกินงบ {percentText}
                        </span>
                        <span>เกิน ฿{formatCurrency(-remaining)}</span>
                    </div>
                ) : (
                    <div className="flex justify-between gap-2 text-xs text-gray-600">
                        <span>
                            {allocated > 0 ? (
                                <>จัดสรร <strong className="text-gray-900">{percentText}</strong></>
                            ) : (
                                "ยังไม่ได้จัดสรร"
                            )}
                        </span>
                        <span>เหลือ ฿{formatCurrency(remaining)}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-bold tracking-wide text-gray-500">ยอดจัดสรร</p>
                <p className="text-base font-semibold tracking-wider">
                    ฿{formatCurrency(allocated)}
                    <span className="font-normal text-gray-500"> จาก ฿{formatCurrency(budgetValue)}</span>
                    <span className={cn("ml-2", isOverBudget ? "text-red-700" : "text-gray-700")}>{percentText}</span>
                </p>
            </div>
            <AllocationBar budgetValue={budgetValue} allocated={allocated} percent={percent} className="h-2.5" />
            <p className={cn("flex items-center gap-1.5 text-sm tracking-wide", isOverBudget ? "font-semibold text-red-800" : "text-gray-600")}>
                {isOverBudget && <TriangleAlert className="size-4" aria-hidden="true" />}
                {isOverBudget
                    ? `เกินงบประมาณ ฿${formatCurrency(-remaining)}`
                    : `คงเหลือให้ตั้ง TOR ได้อีก ฿${formatCurrency(remaining)}`}
            </p>
        </div>
    );
}
