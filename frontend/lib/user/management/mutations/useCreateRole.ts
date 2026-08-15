import { useMutation } from "@tanstack/react-query";
import { createRole } from "@/lib/user/management/api";
import type { RoleFormPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useCreateRole() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: RoleFormPayload) => createRole(payload),
    onSettled: invalidate,
  });
}
