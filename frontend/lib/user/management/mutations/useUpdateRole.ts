import { useMutation } from "@tanstack/react-query";
import { updateRole } from "@/lib/user/management/api";
import type { RoleFormPayload } from "@/lib/user/management/types";
import { useInvalidateCurrentUser } from "@/lib/auth/mutations/useInvalidateCurrentUser";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdateRole(id: number) {
  const invalidateUsers = useInvalidateUsers();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  return useMutation({
    mutationFn: (payload: RoleFormPayload) => updateRole(id, payload),
    onSettled: () => {
      invalidateUsers();
      invalidateCurrentUser();
    },
  });
}
