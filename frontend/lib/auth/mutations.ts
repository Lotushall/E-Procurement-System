import { useMutation } from "@tanstack/react-query";
import { login, register, logout } from "@/lib/auth/api";
import { useAuthStore } from "@/lib/auth/store";
import type { LoginPayload, RegisterPayload } from "@/lib/auth/types";

export function useLogin() {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: () => fetchUser(),
  });
}

export function useRegister() {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: () => fetchUser(),
  });
}

export function useLogout() {
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => setUser(null),
  });
}
