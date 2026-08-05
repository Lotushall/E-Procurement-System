import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "@/lib/auth/api";
import type { ResetPasswordPayload } from "@/lib/auth/types";

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => resetPassword(payload),
  });
}
