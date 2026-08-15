import { useMutation } from "@tanstack/react-query";
import { createPermission } from "@/lib/user/management/api";
import type { PermissionFormPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useCreatePermission() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: PermissionFormPayload) => createPermission(payload),
    onSettled: invalidate,
  });
}
