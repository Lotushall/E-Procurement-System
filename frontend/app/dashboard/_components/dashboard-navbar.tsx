"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationMenu, ProfileMenu } from "@/components/navbar";

export function DashboardNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <span className="text-sm font-semibold">แดชบอร์ด</span>
      </div>
      <div className="flex items-center gap-1">
        <NotificationMenu />
        <ProfileMenu />
      </div>
    </header>
  );
}
