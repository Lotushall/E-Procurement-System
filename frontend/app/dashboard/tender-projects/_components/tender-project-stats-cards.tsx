import { Activity, CheckCircle2, FolderKanban, Wallet, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

export type TenderProjectStats = {
  totalCount: number;
  totalBudget: number;
  inProgressCount: number;
  completedCount: number;
};

const STAT_ITEMS: {
  key: keyof TenderProjectStats;
  label: string;
  format: (value: number) => string;
  skeletonWidth: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}[] = [
    {
      key: "totalCount",
      label: "โครงการทั้งหมด",
      format: (value) => String(value),
      skeletonWidth: "w-8",
      icon: FolderKanban,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      key: "inProgressCount",
      label: "กำลังดำเนินการ",
      format: (value) => String(value),
      skeletonWidth: "w-8",
      icon: Activity,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      key: "totalBudget",
      label: "งบประมาณรวม",
      format: formatCurrency,
      skeletonWidth: "w-32",
      icon: Wallet,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      key: "completedCount",
      label: "เสร็จสิ้นแล้ว",
      format: (value) => String(value),
      skeletonWidth: "w-8",
      icon: CheckCircle2,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

export function TenderProjectStatsCards({
  stats,
  isPending,
}: {
  stats: TenderProjectStats;
  isPending?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="shadow-md ring-0 p-5">
            <CardContent className="flex flex-col gap-2 p-0">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg",
                    item.iconBg,
                  )}
                >
                  <Icon className={cn("size-5.5", item.iconColor)} />
                </div>
                {isPending ? (
                  <Skeleton className={cn("h-7", item.skeletonWidth)} />
                ) : (
                  <div className="flex flex-col">
                    <p className="text-xl font-extrabold">{item.format(stats[item.key])}</p>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
