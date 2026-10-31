"use client";

import type { ReactNode } from "react";
import { Forbidden } from "@/components/forbidden";
import { Spinner } from "@/components/ui/spinner";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { useUser } from "@/lib/auth/queries/useUser";

// permission: ต้องมีสิทธิ์นี้ / permissions: มีสิทธิ์ตัวใดตัวหนึ่งในรายการก็ผ่าน
type RequirePermissionProps =
  | { permission: string; permissions?: never; children: ReactNode }
  | { permission?: never; permissions: string[]; children: ReactNode };

export function RequirePermission({ permission, permissions, children }: RequirePermissionProps) {
  const { data: user, isPending } = useUser();

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-6" />
      </div>
    );
  }

  const required = permissions ?? (permission ? [permission] : []);
  if (!hasAnyPermission(user, required)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
