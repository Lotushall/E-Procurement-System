import { useQuery } from "@tanstack/react-query";
import { TenderProjectListParams } from "../types";
import { fetchTenderProjectsList } from "../api";

export function useTenderProjectsList(
  params: TenderProjectListParams = {},
  page = 1,
  per_page = 20,
) {
  return useQuery({
    queryKey: ["tenders_projects", "list", params, page, per_page],
    queryFn: () => fetchTenderProjectsList(params, page, per_page),
  });
}
