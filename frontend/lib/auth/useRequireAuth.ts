"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/useUser";
import { routes } from "@/lib/routes";

export function useRequireAuth() {
  const router = useRouter();
  const { data: user, isPending } = useUser();

  useEffect(() => {
    if (!isPending && !user) {
      router.replace(routes.auth.login);
    }
  }, [isPending, user, router]);

  return { isChecking: isPending || !user };
}
