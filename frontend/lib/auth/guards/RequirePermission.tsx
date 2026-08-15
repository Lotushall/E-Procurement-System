"use client";

import type { ReactNode } from "react";
import { Forbidden } from "@/components/forbidden";
import { Spinner } from "@/components/ui/spinner";
import { hasPermission } from "@/lib/auth/permissions";
import { useUser } from "@/lib/auth/queries/useUser";

export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  const { data: user, isPending } = useUser();

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!hasPermission(user, permission)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
