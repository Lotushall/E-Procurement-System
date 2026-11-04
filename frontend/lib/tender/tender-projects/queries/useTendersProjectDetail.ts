import { useQuery } from "@tanstack/react-query";
import { isPositiveId } from "@/lib/detail-page";
import { fetchTenderProjectDetail } from "../api";

export function useTendersProjectDetail(id: number) {
  return useQuery({
    queryKey: ["tenders_projects", "detail", id],
    queryFn: () => fetchTenderProjectDetail(id),
    enabled: isPositiveId(id),
  });
}
