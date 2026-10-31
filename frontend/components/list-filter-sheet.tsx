"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * ตัวกรอง + การเรียงลำดับของหน้ารายการบนจอเล็ก: ปุ่มเดียว (มีตัวเลขจำนวนตัวกรองที่ใช้อยู่)
 * เปิด bottom sheet ที่ใส่ช่องของแต่ละหน้าไว้ข้างใน
 * - มี onApply: ตัวกรองแบบร่าง ต้องกด "แสดงผล" ถึงจะมีผล
 * - ไม่มี onApply: ตัวกรองมีผลทันทีที่เลือก ท้าย sheet จึงมีแค่ "เสร็จ"
 */
export function ListFilterSheet({
  activeCount,
  onClear,
  onApply,
  title = "ตัวกรองและการเรียงลำดับ",
  children,
}: {
  activeCount: number;
  onClear: () => void;
  onApply?: () => void;
  title?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={activeCount > 0 ? `ตัวกรอง (ใช้อยู่ ${activeCount})` : "ตัวกรอง"}
            className="relative h-10 shrink-0 gap-2 bg-white"
          />
        }
      >
        <SlidersHorizontal className="size-4 text-gray-600" />
        <span className="hidden sm:inline">ตัวกรอง</span>
        {activeCount > 0 && (
          <span className="flex size-5 items-center justify-center rounded-full bg-red-700 text-[11px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl">
        <SheetHeader className="border-b">
          <SheetTitle className="font-bold">{title}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 overflow-y-auto p-4">{children}</div>

        <SheetFooter className="flex-row border-t">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 bg-white"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
          >
            ล้างตัวกรอง
          </Button>
          <Button
            type="button"
            className="h-10 flex-1 bg-red-700 text-white hover:bg-red-600"
            onClick={() => {
              onApply?.();
              setOpen(false);
            }}
          >
            {onApply ? "แสดงผล" : "เสร็จ"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// หัวข้อย่อยใน sheet เช่น "ตัวกรอง" / "เรียงตาม"
export function ListFilterSheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
      {children}
    </section>
  );
}

// ปุ่มล้างค้นหา + ตัวกรองข้างปุ่มตัวกรองบนจอเล็ก (ไม่ต้องเปิด sheet)
export function ListClearButton({ onClear }: { onClear: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-label="ล้างการค้นหาและตัวกรอง"
      className="h-10 shrink-0 gap-1.5 bg-white"
      onClick={onClear}
    >
      <X className="size-4 text-gray-600" />
      <span className="hidden sm:inline">ล้าง</span>
    </Button>
  );
}
