import { useQuery } from "@tanstack/react-query";
import { fetchUserSessions } from "@/lib/user/management/api";

export function useUserSessions(id: number) {
  return useQuery({
    queryKey: ["users", "detail", id, "sessions"],
    queryFn: () => fetchUserSessions(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
