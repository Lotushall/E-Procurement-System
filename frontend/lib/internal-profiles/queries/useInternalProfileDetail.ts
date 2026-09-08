import { useQuery } from "@tanstack/react-query";
import { fetchInternalProfileDetail } from "../api";

export function useInternalProfileDetail(id: number, enabled = true) {
  return useQuery({
    queryKey: ["internal_profiles", "detail", id],
    queryFn: () => fetchInternalProfileDetail(id),
    enabled: Number.isFinite(id) && id > 0 && enabled,
  });
}
