import { api } from "../api";
import {
  InternalProfileSortBy,
  InternalProfileSortDirection,
  PaginatedUserList,
} from "./types";

export async function fetchInternalProfileList(
  page = 1,
  perPage = 20,
  search?: string,
  sortBy?: InternalProfileSortBy,
  sortDirection?: InternalProfileSortDirection,
): Promise<PaginatedUserList> {
  const { data } = await api.get("/api/v1/dashboard/internal-profiles", {
    params: {
      page,
      per_page: perPage,
      search,
      sort_by: sortBy,
      sort_direction: sortDirection,
    },
  });
  return {
    data: data.data,
    meta: {
      currentPage: data.meta.currentPage,
      lastPage: data.meta.lastPage,
      perPage: data.meta.perPage,
      total: data.meta.total,
    },
  };
}
