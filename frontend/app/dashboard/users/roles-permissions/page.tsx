"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { RequireRole } from "@/lib/auth/guards/RequireRole";
import { routes } from "@/lib/routes";
import { RoleTab } from "./_components/role-tab";
import { PermissionTab } from "./_components/permission-tab";

export default function RolesPermissionsPage() {
  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    { label: "จัดการ Role และสิทธิ์" },
  ]);

  return (
    <RequireRole role="admin">
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">จัดการ Role และสิทธิ์</h1>
          <p className="text-sm text-gray-600 tracking-wide">
            กำหนด role, permission และความสัมพันธ์ระหว่างกันสำหรับพนักงานภายใน
          </p>
        </div>

        <Tabs defaultValue="role">
          <TabsList className="w-fit">
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
