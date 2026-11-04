import { useQuery } from "@tanstack/react-query";
import { isPositiveId } from "@/lib/detail-page";
import { fetchTorDetail } from "../api";

export function useTorDetail(id: number) {
  return useQuery({
    queryKey: ["tors", "detail", id],
    queryFn: () => fetchTorDetail(id),
    enabled: isPositiveId(id),
  });
}
