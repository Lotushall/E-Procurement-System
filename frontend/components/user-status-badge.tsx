import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  active: { label: "ใช้งานอยู่", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  suspended: { label: "ระงับการใช้งาน", badge: "text-orange-600 bg-orange-400/15", dot: "bg-orange-600" },
  inactive: { label: "ปิดใช้งาน", badge: "text-gray-600 bg-gray-400/15", dot: "bg-gray-500" },
};

export function UserStatusBadge({
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
