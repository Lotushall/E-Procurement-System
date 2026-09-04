import { useQuery } from "@tanstack/react-query";
import { TenderProjectSortBy, TenderProjectSortDirection } from "../types";
import { fetchTenderProjectsList } from "../api";

export function useTenderProjectsList(
  search?: string,
  status?: string,
  department_id?: number,
  fiscal_year?: string,
  date_from?: string,
  date_to?: string,
  sort_by?: TenderProjectSortBy,
  sort_direction?: TenderProjectSortDirection,
  page = 1,
  per_page = 20,
) {
  return useQuery({
    queryKey: [
      "tenders_projects",
      search ?? "",
      status ?? "",
      department_id ?? "",
      fiscal_year ?? "",
      date_from ?? "",
      date_to ?? "",
      sort_by ?? "",
      sort_direction ?? "",
      page,
      per_page,
    ],
    queryFn: () =>
      fetchTenderProjectsList(
        search,
        status,
        department_id,
        fiscal_year,
        date_from,
        date_to,
        sort_by,
        sort_direction,
        page,
        per_page,
      ),
  });
}
