import { useMutation } from "@tanstack/react-query";
import { updatePermission } from "@/lib/user/management/api";
import type { PermissionFormPayload } from "@/lib/user/management/types";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useUpdatePermission(name: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (payload: PermissionFormPayload) => updatePermission(name, payload),
    onSettled: invalidate,
  });
}
