import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type TenderProjectStats = {
  totalCount: number;
  totalBudget: number;
  inProgressCount: number;
  completedCount: number;
};

const formatCount = (value: number) => new Intl.NumberFormat("th-TH").format(value);

// จำนวนเงินเต็มจำนวน คั่นหลักพัน + ทศนิยม 2 ตำแหน่งเสมอ: ฿294,540,000.00 (ใช้ใน tooltip)
const formatBudgetFull = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);

// ย่อเป็นหน่วยล้านตั้งแต่ 1 ล้านขึ้นไป: ฿294.54 ล้าน; ต่ำกว่านั้นแสดงเต็ม ฿320,000
const formatBudget = (value: number) => {
  const format = (n: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(n);
  return Math.abs(value) >= 1_000_000 ? `฿${format(value / 1_000_000)} ล้าน` : `฿${format(value)}`;
};

// layout เดียวกับ VendorStatsCards: ชื่อด้านบน ตัวเลขด้านล่าง (ไม่มีไอคอน/สี)
const STAT_ITEMS: {
  key: keyof TenderProjectStats;
  label: string;
  format: (value: number) => string;
  // ค่าเต็มสำหรับ tooltip เมื่อ format ย่อค่า
  fullFormat?: (value: number) => string;
  skeletonWidth: string;
}[] = [
    { key: "totalCount", label: "โครงการทั้งหมด", format: formatCount, skeletonWidth: "w-10" },
    { key: "inProgressCount", label: "กำลังดำเนินการ", format: formatCount, skeletonWidth: "w-10" },
    { key: "completedCount", label: "เสร็จสิ้นแล้ว", format: formatCount, skeletonWidth: "w-10" },
    { key: "totalBudget", label: "งบประมาณรวม", format: formatBudget, fullFormat: formatBudgetFull, skeletonWidth: "w-28" },
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
        // backend ส่ง sum ของ decimal มาเป็น string ได้ จึงแปลงเป็น number ก่อน format
        const value = Number(stats[item.key]);
        return (
          <Card key={item.key} className="shadow-md border-0 ring-0">
            <CardContent className="flex min-w-0 flex-col gap-1">
              <p className="truncate text-sm text-muted-foreground">{item.label}</p>
              {isPending ? (
                <Skeleton className={cn("h-7", item.skeletonWidth)} />
              ) : (
                // ไม่ตัดท้ายเป็น "…": ถ้ายาวเกินการ์ด ให้ขึ้นบรรทัดใหม่แทน
                <p className="text-lg font-bold wrap-anywhere sm:text-xl" title={item.fullFormat?.(value)}>
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
