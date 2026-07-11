import { useMutation } from "@tanstack/react-query";
import { login, register, logout, verifyEmail, resendVerificationEmail } from "@/lib/auth/api";
import { useAuthStore } from "@/lib/auth/store";
import type { LoginPayload, RegisterVendorPayload, VerifyEmailParams } from "@/lib/auth/types";

export function useLogin() {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: () => fetchUser(),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterVendorPayload) => register(payload),
  });
}

export function useLogout() {
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => setUser(null),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (params: VerifyEmailParams) => verifyEmail(params),
  });
}

export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: (email: string) => resendVerificationEmail(email),
  });
}
