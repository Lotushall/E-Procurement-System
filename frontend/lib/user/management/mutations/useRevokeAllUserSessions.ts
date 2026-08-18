import { useMutation } from "@tanstack/react-query";
import { revokeAllUserSessions } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useRevokeAllUserSessions(userId: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (keepCurrent: boolean) => revokeAllUserSessions(userId, keepCurrent),
    onSettled: invalidate,
  });
}
