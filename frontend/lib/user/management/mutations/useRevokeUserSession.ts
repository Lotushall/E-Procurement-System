import { useMutation } from "@tanstack/react-query";
import { revokeUserSession } from "@/lib/user/management/api";
import { useInvalidateUsers } from "./useInvalidateUsers";

export function useRevokeUserSession(userId: number) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (sessionId: string) => revokeUserSession(userId, sessionId),
    onSettled: invalidate,
  });
}
