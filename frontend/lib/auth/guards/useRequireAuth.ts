"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/queries/useUser";
import { loginUrlForCurrentPage } from "@/lib/auth/redirect";

export function useRequireAuth() {
  const router = useRouter();
  const { data: user, isPending } = useUser();

  useEffect(() => {
    if (!isPending && !user) {
      router.replace(loginUrlForCurrentPage());
    }
  }, [isPending, user, router]);

  return { isChecking: isPending || !user };
}
