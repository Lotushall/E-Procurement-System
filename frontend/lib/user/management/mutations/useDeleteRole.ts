import { useMutation } from "@tanstack/react-query";
import { deleteRole } from "@/lib/user/management/api";
import { useInvalidateCurrentUser } from "@/lib/auth/mutations/useInvalidateCurrentUser";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useDeleteRole() {
  const invalidateUsers = useInvalidateUsers();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSettled: () => {
      invalidateUsers();
      invalidateCurrentUser();
    },
  });
}
