import { useMutation } from "@tanstack/react-query";
import { createUser } from "@/lib/user/management/api";
import type { CreateUserPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSettled: invalidate,
  });
}
