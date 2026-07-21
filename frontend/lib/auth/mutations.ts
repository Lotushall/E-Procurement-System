import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register, logout, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, updateAccount, changePassword } from "@/lib/auth/api";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/useUser";
import type { ChangePasswordPayload, LoginPayload, RegisterVendorPayload, ResetPasswordPayload, UpdateAccountPayload, VerifyEmailParams } from "@/lib/auth/types";

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
    mutationFn: () => {
      console.log("[LOGOUT-DEBUG] mutationFn: calling logout()");
      return logout();
    },
    onSuccess: () => {
      console.log("[LOGOUT-DEBUG] hook-level onSuccess: setting query data to null");
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
      console.log("[LOGOUT-DEBUG] cache right after setQueryData:", queryClient.getQueryData(AUTH_USER_QUERY_KEY));
      console.log("[LOGOUT-DEBUG] query state:", queryClient.getQueryState(AUTH_USER_QUERY_KEY));
    },
    onError: (error) => {
      console.log("[LOGOUT-DEBUG] mutation onError:", error);
    },
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

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => resetPassword(payload),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAccountPayload) => updateAccount(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
  });
}
