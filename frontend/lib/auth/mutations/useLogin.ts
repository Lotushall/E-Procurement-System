import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "@/lib/auth/api";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import type { LoginPayload } from "@/lib/auth/types";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY }),
  });
}
