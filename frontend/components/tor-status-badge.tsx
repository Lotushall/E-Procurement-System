import { Badge } from "@/components/ui/badge";
import type { TorStatus } from "@/lib/tender/tor/types";
import { cn } from "@/lib/utils";

// ชื่อสถานะตามศัพท์ใน CONTEXT.md (ความคืบหน้าของ TOR)
export const TOR_STATUS_STYLE: Record<TorStatus, { label: string; badge: string; dot: string }> = {
  draft: { label: "ร่าง", badge: "text-gray-600 bg-gray-400/15", dot: "bg-gray-600" },
  in_review: { label: "รอพิจารณา", badge: "text-yellow-700 bg-yellow-400/20", dot: "bg-yellow-600" },
  revision_required: { label: "ส่งกลับแก้ไข", badge: "text-orange-600 bg-orange-400/15", dot: "bg-orange-600" },
  approved: { label: "อนุมัติแล้ว", badge: "text-sky-700 bg-sky-400/15", dot: "bg-sky-600" },
  bidding: { label: "เปิดรับซอง", badge: "text-blue-600 bg-blue-400/15", dot: "bg-blue-600" },
  closed: { label: "ปิดรับซอง", badge: "text-purple-600 bg-purple-400/15", dot: "bg-purple-600" },
  no_bidder: { label: "ไม่มีผู้ยื่นข้อเสนอ", badge: "text-gray-700 bg-gray-500/15", dot: "bg-gray-700" },
  awarded: { label: "ได้ผู้ชนะ", badge: "text-green-600 bg-green-400/15", dot: "bg-green-600" },
  completed: { label: "เสร็จสิ้น", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  cancelled: { label: "ยกเลิก", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
};

// ลำดับตามสายความคืบหน้า — ใช้เป็นลำดับของตัวกรองสถานะด้วย
export const TOR_STATUSES: TorStatus[] = [
  "draft",
  "in_review",
  "revision_required",
  "approved",
  "bidding",
  "closed",
  "no_bidder",
  "awarded",
  "completed",
  "cancelled",
];

export function TorStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = TOR_STATUS_STYLE[status as TorStatus];
  if (!style) return null;

  return (
    <Badge className={cn("tracking-wider", style.badge, className)}>
      <span className={cn("w-1.75 h-1.75 rounded-full", style.dot)} />
      {style.label}
    </Badge>
  );
}
