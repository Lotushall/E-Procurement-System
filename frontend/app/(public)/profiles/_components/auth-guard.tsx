"use client";

import { useRequireAuth } from "@/lib/auth/useRequireAuth";

export function AuthGuard({ children }: Readonly<{ children: React.ReactNode }>) {
    const { isChecking } = useRequireAuth();

    if (isChecking) {
        return null;
    }

    return <>{children}</>;
}
