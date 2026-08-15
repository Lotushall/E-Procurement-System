import { useMutation } from "@tanstack/react-query";
import { deleteRole } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useDeleteRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSettled: invalidate,
  });
}
