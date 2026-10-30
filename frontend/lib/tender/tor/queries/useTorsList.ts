import { useQuery } from "@tanstack/react-query";
import { TorListParams } from "../types";
import { fetchTorsList } from "../api";

export function useTorsList(params: TorListParams = {}, page = 1, per_page = 20) {
  return useQuery({
    queryKey: ["tors", "list", params, page, per_page],
    queryFn: () => fetchTorsList(params, page, per_page),
  });
}
