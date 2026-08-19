"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserStatusBadge } from "@/components/user-status-badge";
import type { UserDetail, UserStatus } from "@/lib/user/management/types";
import { routes } from "@/lib/routes";
import { getInitials } from "@/lib/utils";

export function UserDetailHeader({
  user,
  status,
}: {
  user: UserDetail;
  status: UserStatus;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-bold text-white">
            {getInitials(user.name)}
          </div>

          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.username} · {user.email}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <UserStatusBadge status={status} />
            <div className="h-4" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            render={<Link href={routes.dashboards.user.edit(user.id)} />}
            nativeButton={false}
          >
            <Pencil />
            แก้ไข
          </Button>
        </div>
      </div>
    </div>
  );
}
