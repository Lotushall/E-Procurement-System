import { Activity, CheckCircle2, FolderKanban, Wallet, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCompactCurrency, formatCurrency } from "@/lib/utils";

export type TenderProjectStats = {
  totalCount: number;
  totalBudget: number;
  inProgressCount: number;
  completedCount: number;
};

const formatCount = (value: number) => new Intl.NumberFormat("th-TH").format(value);

const STAT_ITEMS: {
  key: keyof TenderProjectStats;
  label: string;
  format: (value: number) => string;
  // ค่าเต็มสำหรับ tooltip เมื่อ format ย่อค่า
  fullFormat?: (value: number) => string;
  skeletonWidth: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}[] = [
    {
      key: "totalCount",
      label: "โครงการทั้งหมด",
      format: formatCount,
      skeletonWidth: "w-8",
      icon: FolderKanban,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      key: "inProgressCount",
      label: "กำลังดำเนินการ",
      format: formatCount,
      skeletonWidth: "w-8",
      icon: Activity,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      key: "totalBudget",
      label: "งบประมาณรวม",
      // ค่าเต็มหลักร้อยล้านไม่พอดีการ์ดครึ่งจอบนมือถือ (และการ์ด 1/4 จอบน lg) จึงย่อเป็นหน่วยล้าน
      format: formatCompactCurrency,
      fullFormat: (value) => `฿${formatCurrency(value)}`,
      skeletonWidth: "w-24",
      icon: Wallet,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
    {
      key: "completedCount",
      label: "เสร็จสิ้นแล้ว",
      format: formatCount,
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        // backend ส่ง sum ของ decimal มาเป็น string ได้ จึงแปลงเป็น number ก่อน format
        const value = Number(stats[item.key]);
        return (
          <Card key={item.key} className="shadow-md ring-0 p-4 sm:p-5">
            {/*
              มือถือ: แถวบน ชื่อ ↔ ไอคอน, แถวล่าง ตัวเลขเต็มความกว้างการ์ด (การ์ดครึ่งจอแคบ)
              sm ขึ้นไป: ไอคอนซ้าย (คร่อม 2 แถว), ตัวเลขอยู่บนชื่อทางขวา
            */}
            <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 p-0 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-3">
              <p className="col-start-1 row-start-1 truncate text-xs text-muted-foreground sm:col-start-2 sm:row-start-2 sm:text-sm">
                {item.label}
              </p>
              <div
                className={cn(
                  "col-start-2 row-start-1 flex size-8 items-center justify-center rounded-lg sm:col-start-1 sm:row-span-2 sm:size-11",
                  item.iconBg,
                )}
              >
                <Icon className={cn("size-4 sm:size-5.5", item.iconColor)} />
              </div>
              {isPending ? (
                <Skeleton
                  className={cn(
                    "col-span-2 row-start-2 h-6 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:h-7",
                    item.skeletonWidth,
                  )}
                />
              ) : (
                <p
                  className="col-span-2 row-start-2 truncate text-lg font-extrabold sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:text-xl"
                  title={item.fullFormat?.(value)}
                >
                  {item.format(value)}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
