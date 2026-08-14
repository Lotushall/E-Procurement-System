import { useMutation } from "@tanstack/react-query";
import { updateUserStatus } from "@/lib/user/management/api";
import type { UserStatus } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdateUserStatus(id: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (status: UserStatus) => updateUserStatus(id, status),
    onSettled: invalidate,
  });
}
