import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register, logout, verifyEmail, resendVerificationEmail } from "@/lib/auth/api";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/useUser";
import type { LoginPayload, RegisterVendorPayload, VerifyEmailParams } from "@/lib/auth/types";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterVendorPayload) => register(payload),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => queryClient.setQueryData(AUTH_USER_QUERY_KEY, null),
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
