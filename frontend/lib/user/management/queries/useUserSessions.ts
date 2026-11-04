import { useQuery } from "@tanstack/react-query";
import { isPositiveId } from "@/lib/detail-page";
import { fetchUserSessions } from "@/lib/user/management/api";

export function useUserSessions(id: number) {
  return useQuery({
    queryKey: ["users", "detail", id, "sessions"],
    queryFn: () => fetchUserSessions(id),
    enabled: isPositiveId(id),
  });
}
