"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OnChangeFn, PaginationState, SortingState } from "@tanstack/react-table";
import { useVendorList } from "@/lib/vendor/approval/useVendorList";
import type { VendorSortBy, VendorSortDirection } from "@/lib/vendor/approval/types";
import { digitsOnly } from "@/lib/utils";
import type { VendorListFilter } from "../_components/vendor-stats-cards";

// A phone number typed with separators (e.g. "081-234-5678") won't match the
// digits-only contact_phone column, so strip separators before it's sent as
// the search param — but only when the term actually looks like a phone
// number, so normal name/email searches are left untouched.
const PHONE_LIKE_PATTERN = /^[0-9\s-]+$/;

function normalizeSearchTerm(value: string): string {
  return PHONE_LIKE_PATTERN.test(value) ? digitsOnly(value) : value;
}

const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_PAGE_SIZE = 20;

const STATUS_VALUES: VendorListFilter[] = ["all", "pending", "approved", "rejected"];
const SORT_BY_VALUES: VendorSortBy[] = [
  "created_at",
  "verification_status",
  "user_type",
  "business_type",
  "name",
];

function parseFilter(value: string | null): VendorListFilter {
  return STATUS_VALUES.includes(value as VendorListFilter) ? (value as VendorListFilter) : "all";
}

function parseSortBy(value: string | null): VendorSortBy | undefined {
  return SORT_BY_VALUES.includes(value as VendorSortBy) ? (value as VendorSortBy) : undefined;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function useVendorListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = parseFilter(searchParams.get("status"));
  const debouncedSearch = searchParams.get("search") ?? "";
  const pageIndex = parsePositiveInt(searchParams.get("page"), 1) - 1;
  const pageSize = parsePositiveInt(searchParams.get("per_page"), DEFAULT_PAGE_SIZE);
  const sortBy = parseSortBy(searchParams.get("sort_by"));
  const sortDirection: VendorSortDirection | undefined = sortBy
    ? (searchParams.get("sort_direction") === "asc" ? "asc" : "desc")
    : undefined;

  const [search, setSearch] = useState(debouncedSearch);

  // Sorting and pagination re-arrange/replace rows already on screen rather than
  // producing a wholly new result set, so they shouldn't blank the table out to
  // a skeleton the way search/filter changes do. Tracks whether the in-flight
  // fetch was triggered by a sort or page-change click.
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
    const normalized = normalizeSearchTerm(search.trim());
    if (normalized === debouncedSearch) return;
    const timeout = setTimeout(() => {
      setSkipSkeleton(false);
      updateParams({ search: normalized || null }, true);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, debouncedSearch, updateParams]);

  const setFilter = (next: VendorListFilter) => {
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

  const list = useVendorList(
    filter === "all" ? undefined : filter,
    debouncedSearch || undefined,
    pageIndex + 1,
    pageSize,
    sortBy,
    sortDirection,
  );

  const counts: Record<VendorListFilter, number> = {
    all: list.data?.counts.total ?? 0,
    pending: list.data?.counts.pending ?? 0,
    approved: list.data?.counts.approved ?? 0,
    rejected: list.data?.counts.rejected ?? 0,
  };

  const isFetching = list.isFetching && !skipSkeleton;

  return {
    filter,
    setFilter,
    search,
    setSearch,
    debouncedSearch,
    counts,
    visible: list.data?.vendors ?? [],
    pageCount: list.data?.pagination.lastPage ?? 0,
    total: list.data?.pagination.total ?? 0,
    pagination,
    setPagination,
    sorting,
    setSorting,
    isPending: list.isPending,
    isFetching,
    isError: list.isError,
  };
}
