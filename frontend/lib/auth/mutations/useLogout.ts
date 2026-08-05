import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/auth/api";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      return logout();
    },
    onSuccess: () => {
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
    },
  });
}
