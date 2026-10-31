import { differenceInCalendarDays, differenceInHours, format, isSameYear } from "date-fns";
import { th } from "date-fns/locale";
import type { TorStatus } from "@/lib/tender/tor/types";
import { cn } from "@/lib/utils";

// ช่วงรับซองแสดงเป็น range ตำแหน่งเดิมเสมอ ส่วนข้อความเล็กข้างล่างบอกว่าตอนนี้อยู่ตรงไหนของช่วงนั้น (ดู CONTEXT.md: ช่วงรับซอง)
type BiddingPhase = "planned" | "upcoming" | "open" | "ended" | "cancelled";

const PHASE_BY_STATUS: Record<TorStatus, BiddingPhase> = {
    draft: "planned",
    in_review: "planned",
    revision_required: "planned",
    approved: "planned",
    published: "upcoming",
    bidding: "open",
    closed: "ended",
    no_bidder: "ended",
    awarded: "ended",
    completed: "ended",
    cancelled: "cancelled",
};

const formatDay = (date: Date, withYear: boolean) =>
    format(date, withYear ? "d MMM yyyy" : "d MMM", { locale: th });

// วันเริ่มว่างได้ — หมายถึงเริ่มรับซองทันทีที่ประกาศ
function formatRange(startAt: string | null, endAt: string | null): string | null {
    if (!endAt) return null;

    const end = new Date(endAt);
    if (!startAt) return `เมื่อประกาศ – ${formatDay(end, true)}`;

    const start = new Date(startAt);
    return `${formatDay(start, !isSameYear(start, end))} – ${formatDay(end, true)}`;
}

function describePhase(
    phase: BiddingPhase,
    startAt: string | null,
    endAt: string | null,
    now: Date,
): { text: string; className: string } | null {
    switch (phase) {
        case "planned":
            return { text: "กำหนดการ", className: "text-gray-500" };
        case "upcoming": {
            if (!startAt) return null;
            const days = differenceInCalendarDays(new Date(startAt), now);
            return {
                text: days > 0 ? `เริ่มรับซองในอีก ${days} วัน` : "เริ่มรับซองวันนี้",
                className: "text-indigo-600",
            };
        }
        case "open": {
            if (!endAt) return null;
            const end = new Date(endAt);
            const hoursLeft = differenceInHours(end, now);
            if (hoursLeft < 0) return { text: "ครบกำหนดยื่นแล้ว", className: "text-gray-500" };
            if (hoursLeft < 24) return { text: "เหลือไม่ถึง 1 วัน", className: "font-semibold text-red-600" };
            return { text: `เหลือ ${differenceInCalendarDays(end, now)} วัน`, className: "font-semibold text-blue-600" };
        }
        case "ended":
            return { text: "ปิดรับแล้ว", className: "text-gray-500" };
        case "cancelled":
            return null;
    }
}

export function TorBiddingWindow({
    status,
    biddingStartAt,
    biddingEndAt,
    size = "sm",
    className,
}: {
    status: TorStatus;
    biddingStartAt: string | null;
    biddingEndAt: string | null;
    size?: "sm" | "base";
    className?: string;
}) {
    const phase = PHASE_BY_STATUS[status];
    const range = formatRange(biddingStartAt, biddingEndAt);
    const rangeTextClass = size === "base" ? "text-base" : "text-sm";

    if (!range) {
        return <p className={cn(rangeTextClass, "text-gray-500", className)}>{phase === "cancelled" ? "-" : "ยังไม่กำหนด"}</p>;
    }

    const hint = describePhase(phase, biddingStartAt, biddingEndAt, new Date());

    return (
        <div className={cn("flex flex-col", className)}>
            <p
                className={cn(
                    rangeTextClass,
                    "tracking-wide",
                    phase === "open" ? "font-semibold text-gray-900" : "text-gray-700",
                    phase === "cancelled" && "text-gray-400 line-through",
                )}
            >
                {range}
            </p>
            {hint && <p className={cn("text-xs tracking-wide", hint.className)}>{hint.text}</p>}
        </div>
    );
}
