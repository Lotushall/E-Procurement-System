import { useMutation } from "@tanstack/react-query";
import { verifyEmail } from "@/lib/auth/api";
import type { VerifyEmailParams } from "@/lib/auth/types";

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (params: VerifyEmailParams) => verifyEmail(params),
  });
}
