import type { ReactNode } from "react";
import { InternalGuard } from "./_components/internal-guard";
import { AppSidebar } from "./_components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <InternalGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-semibold">แดชบอร์ด</span>
          </header>
          <div className="flex flex-1 flex-col p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </InternalGuard>
  );
}
