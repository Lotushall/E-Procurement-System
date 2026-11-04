import { useMutation } from "@tanstack/react-query";
import { deletePermission } from "@/lib/user/management/api";
import { useInvalidateCurrentUser } from "@/lib/auth/mutations/useInvalidateCurrentUser";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useDeletePermission() {
  const invalidateUsers = useInvalidateUsers();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  return useMutation({
    mutationFn: (name: string) => deletePermission(name),
    onSettled: () => {
      invalidateUsers();
      invalidateCurrentUser();
    },
  });
}
