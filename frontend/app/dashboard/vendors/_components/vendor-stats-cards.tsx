import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VendorVerificationStatus } from "@/lib/vendor/approval/types";

export type VendorListFilter = "all" | VendorVerificationStatus;

const STAT_STYLE: Record<VendorListFilter, { label: string; ring: string; text: string }> = {
  all: { label: "ทั้งหมด", ring: "ring-foreground/30", text: "text-foreground" },
  pending: { label: "รอตรวจสอบ", ring: "ring-yellow-600/40", text: "text-yellow-600" },
  approved: { label: "อนุมัติแล้ว", ring: "ring-green-800/40", text: "text-green-800" },
  rejected: { label: "ถูกปฏิเสธ", ring: "ring-red-600/40", text: "text-red-600" },
};

const STATS_ORDER: VendorListFilter[] = ["all", "pending", "approved", "rejected"];

export function VendorStatsCards({
  counts,
  active,
  onSelect,
}: {
  counts: Record<VendorListFilter, number>;
  active: VendorListFilter;
  onSelect: (filter: VendorListFilter) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {STATS_ORDER.map((key) => {
        const style = STAT_STYLE[key];
        return (
          <Card
            key={key}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(key);
            }}
            className={cn(
              "cursor-pointer shadow-md transition-shadow border-0 ring-0",
              active === key ? cn("ring-1", style.ring) : "hover:ring-foreground/20",
            )}
          >
            <CardContent className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">{style.label}</p>
              <p className={cn("text-2xl font-bold", style.text)}>{counts[key]}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
