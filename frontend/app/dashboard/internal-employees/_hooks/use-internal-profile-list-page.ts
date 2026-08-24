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
    searchParams,
    updateParams,
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
    setSkipSkeleton,
    resolveIsFetching,
  } = useListPageControls({ sortByValues: SORT_BY_VALUES });

  const departmentFilter = searchParams.get("department") ?? "all";
  const positionFilter = searchParams.get("position") ?? "all";

  const setDepartmentFilter = (next: string) => {
    setSkipSkeleton(false);
    updateParams({ department: next === "all" ? null : next }, true);
  };

  const setPositionFilter = (next: string) => {
    setSkipSkeleton(false);
    updateParams({ position: next === "all" ? null : next }, true);
  };

  const list = useInternalProfileList(
    page,
    pageSize,
    debouncedSearch || undefined,
    sortBy,
    sortDirection,
    departmentFilter === "all" ? undefined : Number(departmentFilter),
    positionFilter === "all" ? undefined : Number(positionFilter),
  );

  return {
    search,
    setSearch,
    debouncedSearch,
    departmentFilter,
    setDepartmentFilter,
    positionFilter,
    setPositionFilter,
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
