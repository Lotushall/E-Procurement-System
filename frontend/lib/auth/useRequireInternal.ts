"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/useUser";
import { routes } from "@/lib/routes";

export function useRequireInternal() {
  const router = useRouter();
  const { data: user, isPending } = useUser();

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      router.replace(routes.auth.login);
    } else if (user.userType !== "internal") {
      router.replace(routes.profiles.profile);
    }
  }, [isPending, user, router]);

  const isAuthorized = !isPending && !!user && user.userType === "internal";
  return { isChecking: !isAuthorized };
}
