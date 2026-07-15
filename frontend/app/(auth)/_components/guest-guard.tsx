"use client";

import { useRequireGuest } from "@/lib/auth/useRequireGuest";

export function GuestGuard({ children }: Readonly<{ children: React.ReactNode }>) {
    const { isChecking } = useRequireGuest();

    if (isChecking) {
        return null;
    }

    return <>{children}</>;
}
