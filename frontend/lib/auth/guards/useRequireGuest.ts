"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/queries/useUser";
import { postLoginPath } from "@/lib/auth/redirect";

export function useRequireGuest() {
  const router = useRouter();
  const { data: user, isPending } = useUser();

  useEffect(() => {
    if (!isPending && user) {
      router.replace(postLoginPath());
    }
  }, [isPending, user, router]);

  return { isChecking: isPending || Boolean(user) };
}
