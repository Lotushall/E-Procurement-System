"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { RequireRole } from "@/lib/auth/guards/RequireRole";
import { routes } from "@/lib/routes";
import { RoleTab } from "./_components/role-tab";
import { PermissionTab } from "./_components/permission-tab";
import { RoleFormDialog } from "./_components/role-form-dialog";
import { PermissionFormDialog } from "./_components/permission-form-dialog";
import { cn } from "@/lib/utils";

type ActiveTab = "role" | "permission";

export default function RolesPermissionsPage() {
  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    { label: "จัดการ Role และ Permission" },
  ]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("role");

  return (
    <RequireRole role="admin">
      <div className="flex flex-col gap-3 md:gap-5">

        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">จัดการ Role และ Permission</h1>
            <p className="text-sm text-gray-600 tracking-wide">
              กำหนด role, permission และความสัมพันธ์ระหว่างกันสำหรับพนักงานภายใน
            </p>
          </div>

          {activeTab === "role" ? <RoleFormDialog /> : <PermissionFormDialog />}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
          <TabsList className={cn(
            "w-full lg:w-85 min-h-12 border p-1 rounded-md space-x-1",
            "*:data-active:bg-red-700 *:data-active:text-white *:data-active:hover:text-white",
            "*:font-bold tracking-wide *:cursor-pointer *:rounded-md"
          )}>
            <TabsTrigger value="role">Role</TabsTrigger>
            <TabsTrigger value="permission">Permission</TabsTrigger>
          </TabsList>

          <TabsContent value="role">
            <RoleTab />
          </TabsContent>
          <TabsContent value="permission">
            <PermissionTab />
          </TabsContent>
        </Tabs>
      </div>
    </RequireRole>
  );
}
