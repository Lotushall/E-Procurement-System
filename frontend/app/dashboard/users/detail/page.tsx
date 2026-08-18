"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "@/lib/breadcrumb/useBreadcrumb";
import { useUserDetail } from "@/lib/user/management/queries/useUserDetail";
import { routes } from "@/lib/routes";
import type { UserStatus } from "@/lib/user/management/types";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./_components/overview-tab";
import { PermissionsTab } from "./_components/permissions-tab";
import { SessionsTab } from "./_components/sessions-tab";
import { UserDetailHeader } from "./_components/user-detail-header";

type ActiveTab = "overview" | "permissions" | "sessions";

export default function UserDetailPage() {
  return (
    <Suspense fallback={null}>
      <UserDetailContent />
    </Suspense>
  );
}

function UserDetailContent() {
  const searchParams = useSearchParams();
  const userId = Number(searchParams.get("id"));
  const isValidId = Number.isFinite(userId) && userId > 0;

  const { data: user, isPending, isError } = useUserDetail(userId);
  const notFound = !isValidId || (isError && !user) || (!isPending && !user);

  const [status, setStatus] = useState<UserStatus | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  useBreadcrumb([
    { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
    isValidId && isPending ? { loading: true } : { label: user?.name ?? "ไม่พบข้อมูล" },
  ]);

  if (isValidId && isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลผู้ใช้รายนี้
      </p>
    );
  }

  const currentStatus = status ?? user.status;

  return (
    <div className="flex flex-col gap-6">
      <UserDetailHeader user={user} status={currentStatus} onStatusChange={setStatus} />

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
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <OverviewTab user={user} status={currentStatus} />
        </TabsContent>
        <TabsContent value="permissions" className="pt-4">
          <PermissionsTab user={user} />
        </TabsContent>
        <TabsContent value="sessions" className="pt-4">
          <SessionsTab userId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
