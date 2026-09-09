import { useQuery } from "@tanstack/react-query";
import { fetchTenderProjectDetail } from "../api";

export function useTendersProjectDetail(id: number) {
  return useQuery({
    queryKey: ["tenders_projects", "detail", id],
    queryFn: () => fetchTenderProjectDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
