import { useMutation } from "@tanstack/react-query";
import { updateUser } from "@/lib/user/management/api";
import type { UpdateUserPayload } from "@/lib/user/management/types";
import { useInvalidateCurrentUser } from "@/lib/auth/mutations/useInvalidateCurrentUser";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdateUser(id: number) {
  const invalidateUsers = useInvalidateUsers();
  const invalidateCurrentUser = useInvalidateCurrentUser();
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => updateUser(id, payload),
    onSettled: () => {
      invalidateUsers();
      invalidateCurrentUser();
    },
  });
}
