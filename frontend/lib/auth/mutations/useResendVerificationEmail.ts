import { useMutation } from "@tanstack/react-query";
import { resendVerificationEmail } from "@/lib/auth/api";

export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: (email: string) => resendVerificationEmail(email),
  });
}
