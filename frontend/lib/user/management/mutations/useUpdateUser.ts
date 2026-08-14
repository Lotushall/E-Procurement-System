import { useMutation } from "@tanstack/react-query";
import { updateUser } from "@/lib/user/management/api";
import type { UpdateUserPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdateUser(id: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => updateUser(id, payload),
    onSettled: invalidate,
  });
}
