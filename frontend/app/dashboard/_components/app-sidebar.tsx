"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutDashboard, Store, UserRound, type LucideIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { hasPermission, hasRole } from "@/lib/auth/permissions";
import { useUser } from "@/lib/auth/queries/useUser";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Item is hidden unless the current user has this permission. */
  permission?: string;
  /** Item is hidden unless the current user has this role. */
  role?: string;
};

const navItems: NavItem[] = [
  {
    href: routes.dashboards.dashboard,
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: routes.dashboards.tor.index,
    label: "การจัดการ TOR",
    icon: FileText,
  },
  {
    href: routes.dashboards.vendors.index,
    label: "ผู้ค้าที่ลงทะเบียน",
    icon: Store,
  },
  {
    href: routes.dashboards.user.index,
    label: "จัดการผู้ใช้",
    icon: UserRound,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: user } = useUser();

  const visibleItems = navItems.filter((item) => {
    if (item.permission && !hasPermission(user, item.permission)) return false;
    if (item.role && !hasRole(user, item.role)) return false;
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="top-14 h-[calc(100svh-3.5rem)]">
      <SidebarContent className="w-65 group-data-[collapsible=icon]:w-full">
        <SidebarGroup className="p-0">
          <SidebarGroupContent className="py-3 px-0 pr-3 group-data-[collapsible=icon]:pr-0">
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem
                    key={item.href}
                    className="mx-2.5 my-0.5"
                  >
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "px-3.5 py-3 h-11",
                        "group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:py-3! group-data-[collapsible=icon]:h-10.5! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:justify-center",
                        "data-active:border-l-[3px] data-active:border-red-700 data-active:bg-red-600/10 data-active:text-red-700 dark:data-active:bg-red-600/20",
                        "data-active:hover:bg-red-600/10 data-active:hover:text-red-700",
                        "hover:bg-transparent"
                      )}
                    >
                      <item.icon className="size-5!" />
                      <span className="font-bold group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
