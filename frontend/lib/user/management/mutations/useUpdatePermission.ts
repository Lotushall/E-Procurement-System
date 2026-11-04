import { useMutation } from "@tanstack/react-query";
import { updatePermission } from "@/lib/user/management/api";
import type { PermissionFormPayload } from "@/lib/user/management/types";
import { useInvalidateCurrentUser } from "@/lib/auth/mutations/useInvalidateCurrentUser";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdatePermission(name: string) {
  const invalidateUsers = useInvalidateUsers();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  return useMutation({
    mutationFn: (payload: PermissionFormPayload) => updatePermission(name, payload),
    onSettled: () => {
      invalidateUsers();
      invalidateCurrentUser();
    },
  });
}
