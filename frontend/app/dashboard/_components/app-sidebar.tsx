"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { routes } from "@/lib/routes";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Image
            src="/images/icon/lotushall_logo.png"
            alt="Lotushall Logo"
            width={28}
            height={28}
            className="shrink-0"
          />
          <span className="text-sm font-bold group-data-[collapsible=icon]:hidden">
            Lotushall Mining
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={routes.dashboards.dashboard} />}
                  isActive={pathname === routes.dashboards.dashboard}
                  tooltip="แดชบอร์ด"
                >
                  <LayoutDashboard />
                  <span>แดชบอร์ด</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={routes.home} />}
                  tooltip="กลับหน้าหลัก"
                >
                  <Home />
                  <span>หน้าหลัก</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
