"use client";

import { useListPageControls } from "@/hooks/use-list-page-controls";
import { useInternalProfileList } from "@/lib/internal-profiles/queries/useInternalProfileList";
import type { InternalProfileSortBy } from "@/lib/internal-profiles/types";

const SORT_BY_VALUES: InternalProfileSortBy[] = [
  "employee_no",
  "firstname",
  "lastname",
  "department",
  "position",
];

export function useInternalProfileListPage() {
  const {
    search,
    setSearch,
    debouncedSearch,
    page,
    pageSize,
    pagination,
    setPagination,
    sortBy,
    sortDirection,
    sorting,
    setSorting,
    resolveIsFetching,
  } = useListPageControls({ sortByValues: SORT_BY_VALUES });

  const list = useInternalProfileList(
    page,
    pageSize,
    debouncedSearch || undefined,
    sortBy,
    sortDirection,
  );

  return {
    search,
    setSearch,
    debouncedSearch,
    visible: list.data?.data ?? [],
    pageCount: list.data?.meta.lastPage ?? 0,
    total: list.data?.meta.total ?? 0,
    pagination,
    setPagination,
    sorting,
    setSorting,
    isPending: list.isPending,
    isFetching: resolveIsFetching(list.isFetching),
    isError: list.isError,
  };
}
