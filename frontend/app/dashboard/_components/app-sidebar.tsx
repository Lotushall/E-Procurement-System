"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOutIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUser } from "@/lib/auth/useUser";
import { useLogout } from "@/lib/auth/mutations";
import { getInitials } from "@/lib/utils";
import { routes } from "@/lib/routes";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useUser();
  const logout = useLogout();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Image
            src="/images/icon/lotushall_logo.png"
            alt="Lotushall Logo"
            width={28}
            height={28}
          />
          <span className="text-sm font-bold">Lotushall Mining</span>
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
                >
                  <LayoutDashboard />
                  <span>แดชบอร์ด</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-700 text-xs font-semibold text-white">
                  {getInitials(user.username)}
                </div>
                <span className="flex-1 truncate text-sm font-medium">
                  {user.username}
                </span>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() =>
                  logout.mutate(undefined, {
                    onSuccess: () => router.push(routes.home),
                  })
                }
              >
                <LogOutIcon />
                <span>ออกจากระบบ</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
