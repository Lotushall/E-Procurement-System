"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, type LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  {
    href: routes.dashboards.dashboard,
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
  },
  {
    href: routes.dashboards.tor.index,
    label: "การจัดการ TOR",
    icon: FileText,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="top-14 h-[calc(100svh-3.5rem)]">
      <SidebarContent className="w-65">
        <SidebarGroup className="p-0">
          <SidebarGroupContent className="py-3 px-0 pr-3">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href} className="mx-2.5 my-0.5">
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className={cn(
                      "px-3.5 py-3 h-11",
                      "data-active:border-l-[3px] data-active:border-red-700 data-active:bg-red-600/10 data-active:text-red-700 dark:data-active:bg-red-600/20",
                      "data-active:hover:bg-red-600/10 data-active:hover:text-red-700",
                      "hover:bg-transparent"
                    )}
                  >
                    <item.icon className="size-5!" />
                    <span className="font-bold">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
