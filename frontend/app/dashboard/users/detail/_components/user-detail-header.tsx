"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IdCardLanyard, Pencil, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserStatusBadge } from "@/components/user-status-badge";
import { useAuthPermissions } from "@/lib/auth/permissions";
import type { UserDetail, UserStatus } from "@/lib/user/management/types";
import { routes } from "@/lib/routes";
import { getInitials } from "@/lib/utils";
import { DeleteUserDialog } from "../../_components/table/delete-user-dialog";

export function UserDetailHeader({
  user,
  status,
}: {
  user: UserDetail;
  status: UserStatus;
}) {
  const router = useRouter();
  const { user: currentUser, hasPermission } = useAuthPermissions();
  const canDeleteUser = hasPermission("users.delete");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-bold text-white">
            {getInitials(user.username)}
          </div>

          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{user.username}</h1>
            <p className="text-sm text-muted-foreground">
              {user.name} · {user.email}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <UserStatusBadge status={status} />
            <div className="h-4" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user.userType === "company" || user.userType === "individual" ? (
            <Button
              variant="outline"
              render={
                <Link href={routes.dashboards.vendors.detail(user.vendorProfileId!)} />
              }
              nativeButton={false}
              className="bg-white"
            >
              <Store />
              ดูข้อมูลผู้ค้า
            </Button>
          ) : user.userType === "internal" ? (
            <Button
              variant="outline"
              render={
                <Link
                  href={routes.dashboards.internal_employees.index(
                    [user.internalProfile?.firstname, user.internalProfile?.lastname]
                      .filter(Boolean)
                      .join(" "),
                  )}
                />
              }
              nativeButton={false}
              className="bg-white"
            >
              <IdCardLanyard />
              ดูข้อมูลพนักงานภายใน
            </Button>
          ) : null}

          <Button
            variant="outline"
            render={<Link href={routes.dashboards.user.edit(user.id)} />}
            nativeButton={false}
            className="bg-white"
          >
            <Pencil />
            แก้ไข
          </Button>

          {canDeleteUser && (
            <DeleteUserDialog
              user={user}
              currentUserId={currentUser?.id}
              onDeleted={() => router.push(routes.dashboards.user.index)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
