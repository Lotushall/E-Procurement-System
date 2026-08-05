import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAccount } from "@/lib/auth/api";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import type { UpdateAccountPayload } from "@/lib/auth/types";

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAccountPayload) => updateAccount(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY }),
  });
}
