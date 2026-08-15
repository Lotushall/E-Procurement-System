import { useMutation } from "@tanstack/react-query";
import { deletePermission } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useDeletePermission() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (name: string) => deletePermission(name),
    onSettled: invalidate,
  });
}
