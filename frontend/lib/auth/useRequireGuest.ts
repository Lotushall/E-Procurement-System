"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/useUser";
import { routes } from "@/lib/routes";

export function useRequireGuest() {
  const router = useRouter();
  const { data: user, isPending } = useUser();

  useEffect(() => {
    if (!isPending && user) {
      router.replace(routes.home);
    }
  }, [isPending, user, router]);

  return { isChecking: isPending || Boolean(user) };
}
