"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { routes } from "@/lib/routes";
import type { UserStatus } from "@/lib/user/management/types";
import { cn } from "@/lib/utils";
import { ActivityTab } from "./_components/activity-tab";
import { OverviewTab } from "./_components/overview-tab";
import { PermissionsTab } from "./_components/permissions-tab";
import { SessionsTab } from "./_components/sessions-tab";
import { UserDetailHeader } from "./_components/user-detail-header";
import { MOCK_USER_DETAIL } from "./_data/mock-user-detail";

type ActiveTab = "overview" | "permissions" | "sessions" | "activity";

export default function UserDetailPage() {
  const user = MOCK_USER_DETAIL;
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    { label: user.name },
  ]);

  return (
    <div className="flex flex-col gap-6">
      <UserDetailHeader user={user} status={status} onStatusChange={setStatus} />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
        <TabsList
          className={cn(
            "min-h-11 w-fit border p-1 rounded-md space-x-1",
            "*:data-active:bg-red-700 *:data-active:text-white *:data-active:hover:text-white",
            "*:font-bold tracking-wide *:cursor-pointer *:rounded-md *:px-3"
          )}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <OverviewTab user={user} status={status} />
        </TabsContent>
        <TabsContent value="permissions" className="pt-4">
          <PermissionsTab user={user} />
        </TabsContent>
        <TabsContent value="sessions" className="pt-4">
          <SessionsTab sessions={user.sessions} />
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          <ActivityTab activity={user.activity} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
