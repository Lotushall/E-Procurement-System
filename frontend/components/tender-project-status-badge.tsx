import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  draft: { label: "ร่าง", badge: "text-gray-600 bg-gray-400/15", dot: "bg-gray-600" },
  published: { label: "กำลังดำเนินการ", badge: "text-blue-600 bg-blue-400/15", dot: "bg-blue-600" },
  closed: { label: "ปิดรับซอง", badge: "text-orange-600 bg-orange-400/15", dot: "bg-orange-600" },
  completed: { label: "เสร็จสิ้น", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  cancelled: { label: "ยกเลิก", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
  archived: { label: "เก็บถาวร", badge: "text-gray-500 bg-gray-300/20", dot: "bg-gray-500" },
};

export function TenderProjectStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLE[status];
  if (!style) return null;

  return (
    <Badge className={cn("tracking-wider", style.badge, className)}>
      <span className={cn("w-1.75 h-1.75 rounded-full", style.dot)} />
      {style.label}
    </Badge>
  );
}
