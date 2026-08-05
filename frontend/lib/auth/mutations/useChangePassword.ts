import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@/lib/auth/api";
import type { ChangePasswordPayload } from "@/lib/auth/types";

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
  });
}
