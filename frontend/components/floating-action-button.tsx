"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Plus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FloatingAction {
  label: string;
  icon: LucideIcon;
  // ไปหน้าอื่น (ลิงก์จริง) หรือทำงานในหน้า เช่นเปิด dialog — ใส่อย่างใดอย่างหนึ่ง
  href?: string;
  onSelect?: () => void;
}

// data-fab: ให้ dashboard layout เว้นที่ด้านล่าง และ ScrollToTop ขยับขึ้นไปอยู่เหนือปุ่มนี้
// (และซ่อนตัวเองตอน speed dial เปิด ไม่ให้ทับปุ่มย่อย)
const FAB_CLASS =
  "fixed right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-40 size-12 rounded-full bg-red-700 text-white shadow-lg shadow-red-900/30 hover:bg-red-600";

// แถวของปุ่มย่อย: ป้ายชื่อทางซ้าย + ปุ่มกลมเล็ก; ทั้งแถวเป็น item เดียว (แตะป้ายหรือปุ่มก็ได้)
const DIAL_ITEM_CLASS = "group/dial flex cursor-pointer items-center justify-end gap-3 outline-none select-none";

function DialItemContent({ action }: { action: FloatingAction }): ReactNode {
  const Icon = action.icon;
  return (
    <>
      <span className="rounded-md bg-white px-3 py-1.5 text-sm font-medium whitespace-nowrap text-gray-800 shadow-md group-data-highlighted/dial:bg-gray-100">
        {action.label}
      </span>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-600 shadow-md group-data-highlighted/dial:bg-gray-100 group-data-highlighted/dial:ring-2 group-data-highlighted/dial:ring-red-700/40">
        <Icon className="size-5" aria-hidden="true" />
      </span>
    </>
  );
}

/**
 * ปุ่มกลมลอยมุมขวาล่าง (FAB)
 * - action เดียว: กดแล้วทำทันที
 * - หลาย action: speed dial — ฉากหลังมืดคลุมหน้า ปุ่มกลมเล็กเรียงขึ้นไปเหนือปุ่มหลัก ปุ่มหลัก + หมุนเป็น ×
 *   ใช้ Menu ของ base-ui: Esc / แตะฉากหลังปิด, ลูกศรขึ้นลงเลือก, focus กลับมาที่ปุ่มหลัก
 * ส่ง actions ที่กรองตามสิทธิ์มาแล้ว; ไม่มีเลยจะไม่แสดงปุ่ม
 */
export function FloatingActionButton({
  actions,
  menuLabel = "เมนูเพิ่มเติม",
}: {
  actions: FloatingAction[];
  // aria-label ของปุ่มเมื่อเป็น speed dial (หลาย action)
  menuLabel?: string;
}) {
  if (actions.length === 0) return null;

  if (actions.length === 1) {
    const [action] = actions;
    const Icon = action.icon;
    return (
      <Button
        data-fab=""
        aria-label={action.label}
        title={action.label}
        className={FAB_CLASS}
        onClick={action.onSelect}
        {...(action.href ? { render: <Link href={action.href} />, nativeButton: false } : {})}
      >
        <Icon className="size-6" />
      </Button>
    );
  }

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        render={
          <Button
            data-fab=""
            aria-label={menuLabel}
            title={menuLabel}
            // ตอนเปิด ปุ่มหลักต้องอยู่เหนือฉากหลังมืด (z-50) เพื่อกดปิดได้; + หมุนเป็น ×
            className={cn(FAB_CLASS, "data-popup-open:z-50 [&_svg]:transition-transform data-popup-open:[&_svg]:rotate-45")}
          />
        }
      >
        <Plus className="size-6" />
      </MenuPrimitive.Trigger>

      <MenuPrimitive.Portal>
        <MenuPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        {/* align end + pr-1: กึ่งกลางปุ่มย่อย (size-10) ตรงกับกึ่งกลางปุ่มหลัก (size-12) */}
        <MenuPrimitive.Positioner side="top" align="end" sideOffset={16} className="isolate z-50 outline-none">
          <MenuPrimitive.Popup
            // ปุ่มย่อยตัวแรกอยู่ชิดปุ่มหลักที่สุด (flex-col-reverse)
            className="flex flex-col-reverse gap-4 pr-1 outline-none transition-[opacity,translate] duration-150 data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0"
          >
            {actions.map((action) =>
              action.href ? (
                <MenuPrimitive.LinkItem
                  key={action.label}
                  closeOnClick
                  render={<Link href={action.href} />}
                  className={DIAL_ITEM_CLASS}
                >
                  <DialItemContent action={action} />
                </MenuPrimitive.LinkItem>
              ) : (
                <MenuPrimitive.Item key={action.label} onClick={action.onSelect} className={DIAL_ITEM_CLASS}>
                  <DialItemContent action={action} />
                </MenuPrimitive.Item>
              ),
            )}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
