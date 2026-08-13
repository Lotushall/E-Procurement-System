"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import { useUserList } from "@/lib/user/management/queries/useUserList";
import type { UserSortBy, UserSortDirection, UserStatus, UserType } from "@/lib/user/management/types";

export type UserTypeFilter = "all" | UserType;
export type UserStatusFilter = "all" | UserStatus;

const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_PAGE_SIZE = 20;

const TYPE_VALUES: UserTypeFilter[] = ["all", "internal", "company", "individual"];
const STATUS_VALUES: UserStatusFilter[] = ["all", "pending", "active", "suspended", "inactive"];
const SORT_BY_VALUES: UserSortBy[] = ["created_at", "username", "email"];

function parseTypeFilter(value: string | null): UserTypeFilter {
  return TYPE_VALUES.includes(value as UserTypeFilter) ? (value as UserTypeFilter) : "all";
}

function parseStatusFilter(value: string | null): UserStatusFilter {
  return STATUS_VALUES.includes(value as UserStatusFilter) ? (value as UserStatusFilter) : "all";
}

function parseSortBy(value: string | null): UserSortBy | undefined {
  return SORT_BY_VALUES.includes(value as UserSortBy) ? (value as UserSortBy) : undefined;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function useUserListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const typeFilter = parseTypeFilter(searchParams.get("type"));
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const debouncedSearch = searchParams.get("search") ?? "";
  const pageIndex = parsePositiveInt(searchParams.get("page"), 1) - 1;
  const pageSize = parsePositiveInt(searchParams.get("per_page"), DEFAULT_PAGE_SIZE);
  const sortBy = parseSortBy(searchParams.get("sort_by"));
  const sortDirection: UserSortDirection | undefined = sortBy
    ? (searchParams.get("sort_direction") === "asc" ? "asc" : "desc")
    : undefined;

  const [search, setSearch] = useState(debouncedSearch);
  const [skipSkeleton, setSkipSkeleton] = useState(false);

  const updateParams = useCallback(
    (updates: Record<string, string | number | null>, resetPage = false) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      if (resetPage) params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const normalized = search.trim();
    if (normalized === debouncedSearch) return;
    const timeout = setTimeout(() => {
      setSkipSkeleton(false);
      updateParams({ search: normalized || null }, true);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, debouncedSearch, updateParams]);

  const setTypeFilter = (next: UserTypeFilter) => {
    setSkipSkeleton(false);
    updateParams({ type: next === "all" ? null : next }, true);
  };

  const setStatusFilter = (next: UserStatusFilter) => {
    setSkipSkeleton(false);
    updateParams({ status: next === "all" ? null : next }, true);
  };

  const pagination: PaginationState = { pageIndex, pageSize };

  const setPagination: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setSkipSkeleton(true);
    updateParams({
      page: next.pageIndex === 0 ? null : next.pageIndex + 1,
      per_page: next.pageSize === DEFAULT_PAGE_SIZE ? null : next.pageSize,
    });
  };

  const sorting: SortingState = sortBy ? [{ id: sortBy, desc: sortDirection === "desc" }] : [];

  const setSorting: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const nextSort = next[0];
    setSkipSkeleton(true);
    updateParams(
      {
        sort_by: nextSort ? nextSort.id : null,
        sort_direction: nextSort ? (nextSort.desc ? "desc" : "asc") : null,
      },
      true,
    );
  };

  const list = useUserList(
    typeFilter === "all" ? undefined : typeFilter,
    statusFilter === "all" ? undefined : statusFilter,
    debouncedSearch || undefined,
    pageIndex + 1,
    pageSize,
    sortBy,
    sortDirection,
  );

  const isFetching = list.isFetching && !skipSkeleton;

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
    isFetching,
    isError: list.isError,
  };
}
