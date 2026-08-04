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
            <div className="flex flex-1 flex-col px-6.5 pt-5.5 pb-10">
              <DashboardBreadcrumb />
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </InternalGuard>
      <ScrollToTop />
    </>
  );
}
