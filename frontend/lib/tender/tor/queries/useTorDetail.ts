import { useQuery } from "@tanstack/react-query";
import { fetchTorDetail } from "../api";

export function useTorDetail(id: number) {
  return useQuery({
    queryKey: ["tors", "detail", id],
    queryFn: () => fetchTorDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
