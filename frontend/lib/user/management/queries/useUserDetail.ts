import { useQuery } from "@tanstack/react-query";
import { isPositiveId } from "@/lib/detail-page";
import { fetchUserDetail } from "@/lib/user/management/api";

export function useUserDetail(id: number, enabled = true) {
  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: () => fetchUserDetail(id),
    enabled: isPositiveId(id) && enabled,
  });
}
