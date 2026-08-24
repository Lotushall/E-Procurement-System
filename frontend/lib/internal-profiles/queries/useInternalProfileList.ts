import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchInternalProfileList } from "../api";
import type { InternalProfileSortBy, InternalProfileSortDirection } from "../types";

export function useInternalProfileList(
  page = 1,
  perPage = 20,
  search?: string,
  sortBy?: InternalProfileSortBy,
  sortDirection?: InternalProfileSortDirection,
  departmentId?: number,
  positionId?: number,
) {
  return useQuery({
    queryKey: [
      "internal_profiles",
      page,
      perPage,
      search ?? "",
      sortBy ?? "",
      sortDirection ?? "",
      departmentId ?? "",
      positionId ?? "",
    ],
    queryFn: () =>
      fetchInternalProfileList(
        page,
        perPage,
        search,
        sortBy,
        sortDirection,
        departmentId,
        positionId,
      ),
    placeholderData: keepPreviousData,
  });
}
