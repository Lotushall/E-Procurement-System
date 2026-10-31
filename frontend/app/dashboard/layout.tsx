import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InternalGuard } from "./_components/internal-guard";
import { AppSidebar } from "./_components/app-sidebar";
import { DashboardNavbar } from "./_components/dashboard-navbar";
import { DashboardBreadcrumb } from "./_components/dashboard-breadcrumb";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

export const metadata: Metadata = {
  title: {
    default: "แดชบอร์ด",
    template: "%s | Lotushall Mining E-Bidding",
  },
  description: "แดชบอร์ดสำหรับผู้ใช้งานภายใน Lotushall Mining",
};

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <InternalGuard>
        <SidebarProvider style={{ "--sidebar-width-icon": "74px" } as React.CSSProperties}>
          <DashboardNavbar />
          <AppSidebar />
          <SidebarInset className="pt-14">
            {/* หน้าที่มีปุ่มลอย (data-fab): เว้นที่ด้านล่างให้ปุ่มลอย + ScrollToTop ที่ซ้อนอยู่เหนือมัน ไม่ให้บัง pagination */}
            {/* หน้าที่มีแถบปุ่มติดล่างจอบนมือถือ (data-bottom-bar เช่นรายละเอียดผู้ค้า): เว้นที่ให้แถบ */}
            <div className="flex flex-1 flex-col px-6.5 pt-5.5 pb-10 has-data-fab:pb-36 max-sm:has-data-bottom-bar:pb-28">
              <DashboardBreadcrumb />
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </InternalGuard>
      {/*
        หน้าที่มีปุ่มลอย (data-fab, เช่นปุ่มสร้างโครงการ): ปุ่มลอยอยู่มุมล่าง
        ScrollToTop ขยับขึ้นไปซ้อนเหนือมัน (1.5rem + ปุ่ม 3rem + ช่องว่าง 0.75rem)
      */}
      {/* ตอน speed dial เปิด (data-popup-open) ซ่อน ScrollToTop ไม่ให้ทับปุ่มย่อยที่เรียงขึ้นไป */}
      {/* แถบปุ่มติดล่างจอบนมือถือ (data-bottom-bar สูง ~4.3rem): ScrollToTop ขยับขึ้นไปอยู่เหนือแถบ */}
      <ScrollToTop className="[body:has([data-fab])_&]:bottom-[calc(5.25rem+env(safe-area-inset-bottom))] [body:has([data-fab][data-popup-open])_&]:pointer-events-none [body:has([data-fab][data-popup-open])_&]:opacity-0 max-sm:[body:has([data-bottom-bar])_&]:bottom-[calc(5.5rem+env(safe-area-inset-bottom))]" />
    </>
  );
}
