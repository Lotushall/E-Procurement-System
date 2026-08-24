"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";

export type ListSortDirection = "asc" | "desc";

export interface UseListPageControlsOptions<SortBy extends string> {
  sortByValues: readonly SortBy[];
  defaultPageSize?: number;
  searchDebounceMs?: number;
  normalizeSearch?: (value: string) => string;
}

const identity = (value: string) => value;

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Shared URL-driven state (search/page/sort) for server-paginated list pages.
 * Feature-specific filters stay in the calling hook — read them off the
 * returned `searchParams`, and write them via `updateParams`/`setSkipSkeleton`.
 */
export function useListPageControls<SortBy extends string>({
  sortByValues,
  defaultPageSize = 20,
  searchDebounceMs = 350,
  normalizeSearch = identity,
}: UseListPageControlsOptions<SortBy>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const debouncedSearch = searchParams.get("search") ?? "";
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(
    searchParams.get("per_page"),
    defaultPageSize,
  );
  const rawSortBy = searchParams.get("sort_by");
  const sortBy = sortByValues.includes(rawSortBy as SortBy)
    ? (rawSortBy as SortBy)
    : undefined;
  const sortDirection: ListSortDirection | undefined = sortBy
    ? searchParams.get("sort_direction") === "asc"
      ? "asc"
      : "desc"
    : undefined;

  const [search, setSearch] = useState(debouncedSearch);
  const [syncedSearch, setSyncedSearch] = useState(debouncedSearch);
  const [skipSkeleton, setSkipSkeleton] = useState(true);
  const [wasFetching, setWasFetching] = useState(false);

  // Resync the input when the URL's search param changes from outside this
  // hook's own debounce flow (e.g. browser back/forward navigation) — without
  // this, the input can keep showing stale text after such a navigation.
  if (debouncedSearch !== syncedSearch) {
    setSyncedSearch(debouncedSearch);
    setSearch(debouncedSearch);
  }

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
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const normalized = normalizeSearch(search.trim());
    if (normalized === debouncedSearch) return;
    const timeout = setTimeout(() => {
      setSkipSkeleton(false);
      updateParams({ search: normalized || null }, true);
    }, searchDebounceMs);
    return () => clearTimeout(timeout);
  }, [search, debouncedSearch, normalizeSearch, searchDebounceMs, updateParams]);

  const pagination: PaginationState = { pageIndex: page - 1, pageSize };

  const setPagination: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setSkipSkeleton(true);
    updateParams({
      page: next.pageIndex === 0 ? null : next.pageIndex + 1,
      per_page: next.pageSize === defaultPageSize ? null : next.pageSize,
    });
  };

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortDirection === "desc" }]
    : [];

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

  const resolveIsFetching = (rawIsFetching: boolean) => {
    if (rawIsFetching !== wasFetching) {
      setWasFetching(rawIsFetching);
      if (!rawIsFetching) setSkipSkeleton(true);
    }
    return rawIsFetching && !skipSkeleton;
  };

  return {
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
  };
}
