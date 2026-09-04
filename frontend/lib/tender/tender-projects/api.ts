import { api } from "@/lib/api";
import {
  PaginatedTenderProjectsList,
  TenderProjectSortBy,
  TenderProjectSortDirection,
} from "./types";

export async function fetchTenderProjectsList(
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
): Promise<PaginatedTenderProjectsList> {
  const { data } = await api.get("/api/v1/dashboard/tender-projects", {
    params: {
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
    },
  });

  return {
    data: data.data,
    meta: {
      currentPage: data.meta.currentPage,
      lastPage: data.meta.lastPage,
      perPage: data.meta.perPage,
      total: data.meta.total,
      stats: data.meta.stats,
    },
  };
}

export async function createTenderProjects() {
  // Implementation for creating a new tender project
}
