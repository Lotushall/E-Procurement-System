import { useMutation } from "@tanstack/react-query";
import { updateRole } from "@/lib/user/management/api";
import type { RoleFormPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdateRole(id: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: RoleFormPayload) => updateRole(id, payload),
    onSettled: invalidate,
  });
}
