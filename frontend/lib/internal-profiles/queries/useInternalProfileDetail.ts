import { useQuery } from "@tanstack/react-query";
import { isPositiveId } from "@/lib/detail-page";
import { fetchInternalProfileDetail } from "../api";

export function useInternalProfileDetail(id: number, enabled = true) {
  return useQuery({
    queryKey: ["internal_profiles", "detail", id],
    queryFn: () => fetchInternalProfileDetail(id),
    enabled: isPositiveId(id) && enabled,
  });
}
