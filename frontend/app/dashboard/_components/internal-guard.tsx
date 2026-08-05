"use client";

import { useRequireInternal } from "@/lib/auth/guards/useRequireInternal";
import { Spinner } from "@/components/ui/spinner";

export function InternalGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isChecking } = useRequireInternal();

  if (isChecking) {
    return (
      <div className="flex h-svh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return <>{children}</>;
}
