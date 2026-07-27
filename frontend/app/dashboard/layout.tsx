import type { Metadata } from "next";
import type { ReactNode } from "react";
import { InternalGuard } from "./_components/internal-guard";
import { AppSidebar } from "./_components/app-sidebar";
import { DashboardNavbar } from "./_components/dashboard-navbar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: {
    default: "แดชบอร์ด",
    template: "%s | Lotushall Mining E-Bidding",
  },
  description: "แดชบอร์ดสำหรับผู้ใช้งานภายใน Lotushall Mining",
};

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <InternalGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardNavbar />
          <div className="flex flex-1 flex-col p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </InternalGuard>
  );
}
