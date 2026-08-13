import { useQuery } from "@tanstack/react-query";
import { fetchUserDetail } from "@/lib/user/management/api";

export function useUserDetail(id: number) {
  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: () => fetchUserDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
