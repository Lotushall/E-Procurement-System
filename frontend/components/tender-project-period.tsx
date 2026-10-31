import { CalendarDays } from "lucide-react";
import { differenceInCalendarDays, differenceInMonths, format } from "date-fns";
import { th } from "date-fns/locale";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";
import { cn } from "@/lib/utils";

// โครงการที่ปิดแล้วไม่ต้องนับถอยหลัง ไม่ว่าวันสิ้นสุดจะผ่านไปหรือยัง
const ENDED_STATUSES: TenderProjectStatus[] = ["completed", "cancelled", "archived"];
const ENDING_SOON_DAYS = 30;

const TONE_CLASS = {
    muted: "bg-gray-100 text-gray-700",
    info: "bg-blue-50 text-blue-700",
    warning: "bg-orange-50 text-orange-700",
    danger: "bg-red-50 text-red-700",
} as const;

const formatDay = (value: string) => format(new Date(value), "d MMM yyyy", { locale: th });

function formatPeriod(startAt?: string, endAt?: string): string | null {
    if (startAt && endAt) return `${formatDay(startAt)} – ${formatDay(endAt)}`;
    if (startAt) return `เริ่ม ${formatDay(startAt)} · ยังไม่กำหนดวันสิ้นสุด`;
    if (endAt) return `สิ้นสุด ${formatDay(endAt)}`;
    return null;
}

function describePeriod(
    status: TenderProjectStatus,
    startAt: string | undefined,
    endAt: string | undefined,
    now: Date,
): { text: string; tone: keyof typeof TONE_CLASS } | null {
    if (ENDED_STATUSES.includes(status)) return { text: "สิ้นสุดแล้ว", tone: "muted" };

    if (startAt) {
        const daysToStart = differenceInCalendarDays(new Date(startAt), now);
        if (daysToStart > 0) return { text: `เริ่มในอีก ${daysToStart} วัน`, tone: "muted" };
    }

    if (!endAt) return null;

    const end = new Date(endAt);
    const daysLeft = differenceInCalendarDays(end, now);
    if (daysLeft < 0) return { text: `เลยกำหนด ${-daysLeft} วัน`, tone: "danger" };
    if (daysLeft === 0) return { text: "สิ้นสุดวันนี้", tone: "warning" };
    if (daysLeft <= ENDING_SOON_DAYS) return { text: `เหลือ ${daysLeft} วัน`, tone: "warning" };
    return { text: `เหลือ ${differenceInMonths(end, now)} เดือน`, tone: "info" };
}

// แถว "ระยะเวลาโครงการ" — มีป้ายกำกับเสมอ ไม่ให้สับสนกับช่วงรับซองของ TOR
export function TenderProjectPeriod({
    status,
    projectStartAt,
    projectEndAt,
}: {
    status: TenderProjectStatus;
    projectStartAt?: string;
    projectEndAt?: string;
}) {
    const period = formatPeriod(projectStartAt, projectEndAt);
    const hint = describePeriod(status, projectStartAt, projectEndAt, new Date());

    return (
        <div className="flex items-center gap-2.5">
            <CalendarDays className="size-4 shrink-0 text-gray-600" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs text-gray-600">ระยะเวลาโครงการ</span>
                <span className={cn("text-sm", period ? "font-semibold" : "text-gray-600")}>
                    {period ?? "ยังไม่กำหนดระยะเวลา"}
                </span>
            </div>
            {hint && (
                <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", TONE_CLASS[hint.tone])}>
                    {hint.text}
                </span>
            )}
        </div>
    );
}
