import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// skeleton ของการ์ดที่ DataTable แสดงแทนตารางบนจอเล็กกว่า xl (renderMobileCard) — layout grid เดียวกัน
// className: ส่งค่าเดียวกับ mobileCardGridClassName ของ DataTable ในหน้านั้น
export function DataTableCardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:hidden", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="border-t bg-gray-50 px-4 py-3">
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
