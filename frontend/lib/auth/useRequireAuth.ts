"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/useUser";
import { routes } from "@/lib/routes";

export function useRequireAuth() {
  const router = useRouter();
  const { data: user, isPending } = useUser();

  console.log("[LOGOUT-DEBUG] useRequireAuth render: isPending=", isPending, "user=", user);

  useEffect(() => {
    console.log("[LOGOUT-DEBUG] useRequireAuth effect: isPending=", isPending, "user=", user);
    if (!isPending && !user) {
      console.log("[LOGOUT-DEBUG] useRequireAuth: redirecting to login");
      router.replace(routes.auth.login);
    }
  }, [isPending, user, router]);

  return { isChecking: isPending || !user };
}
