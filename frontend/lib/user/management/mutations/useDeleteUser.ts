import { useMutation } from "@tanstack/react-query";
import { deleteUser } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSettled: invalidate,
  });
}
