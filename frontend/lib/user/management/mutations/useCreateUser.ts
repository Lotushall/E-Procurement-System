import { useMutation } from "@tanstack/react-query";
import { createUser } from "@/lib/user/management/api";
import type { CreateUserPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";
import { useInvalidateInternalProfiles } from "@/lib/internal-profiles/mutations/useInvalidateInternalProfiles";

export function useCreateUser() {
  const invalidateUsers = useInvalidateUsers();
  const invalidateInternalProfiles = useInvalidateInternalProfiles();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSettled: () => {
      invalidateUsers();
      invalidateInternalProfiles();
    },
  });
}
