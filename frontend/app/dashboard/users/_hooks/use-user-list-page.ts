"use client";

import { useListPageControls } from "@/hooks/use-list-page-controls";
import { useUserList } from "@/lib/user/management/queries/useUserList";
import type {
  UserSortBy,
  UserStatusFilter,
  UserTypeFilter,
} from "@/lib/user/management/types";

const TYPE_VALUES: UserTypeFilter[] = ["all", "internal", "company", "individual"];
const STATUS_VALUES: UserStatusFilter[] = ["all", "pending", "active", "suspended", "inactive"];
const SORT_BY_VALUES: UserSortBy[] = ["created_at", "username", "email"];

function parseTypeFilter(value: string | null): UserTypeFilter {
  return TYPE_VALUES.includes(value as UserTypeFilter) ? (value as UserTypeFilter) : "all";
}

function parseStatusFilter(value: string | null): UserStatusFilter {
  return STATUS_VALUES.includes(value as UserStatusFilter) ? (value as UserStatusFilter) : "all";
}

export function useUserListPage() {
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

  const typeFilter = parseTypeFilter(searchParams.get("type"));
  const statusFilter = parseStatusFilter(searchParams.get("status"));

  const setTypeFilter = (next: UserTypeFilter) => {
    setSkipSkeleton(false);
    updateParams({ type: next === "all" ? null : next }, true);
  };

  const setStatusFilter = (next: UserStatusFilter) => {
    setSkipSkeleton(false);
    updateParams({ status: next === "all" ? null : next }, true);
  };

  const list = useUserList(
    {
      type: typeFilter === "all" ? undefined : typeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: debouncedSearch || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
    },
    page,
    pageSize,
  );

  return {
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
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
