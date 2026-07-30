import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, { label: string; badge: string; dot: string }> = {
  pending: { label: "รอตรวจสอบ", badge: "text-yellow-600 bg-yellow-400/15", dot: "bg-yellow-600" },
  approved: { label: "อนุมัติแล้ว", badge: "text-green-800 bg-green-700/15", dot: "bg-green-800" },
  rejected: { label: "ถูกปฏิเสธ", badge: "text-red-600 bg-red-400/15", dot: "bg-red-600" },
};

export function VendorStatusBadge({
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
