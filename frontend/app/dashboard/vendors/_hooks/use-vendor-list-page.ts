"use client";

import { useListPageControls } from "@/hooks/use-list-page-controls";
import { useVendorList } from "@/lib/vendor/approval/queries/useVendorList";
import type { VendorListFilter, VendorSortBy } from "@/lib/vendor/approval/types";
import { digitsOnly } from "@/lib/utils";

// A phone number typed with separators (e.g. "081-234-5678") won't match the
// digits-only contact_phone column, so strip separators before it's sent as
// the search param — but only when the term actually looks like a phone
// number, so normal name/email searches are left untouched.
const PHONE_LIKE_PATTERN = /^[0-9\s-]+$/;

function normalizeSearchTerm(value: string): string {
  return PHONE_LIKE_PATTERN.test(value) ? digitsOnly(value) : value;
}

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

export function useVendorListPage() {
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
  } = useListPageControls({
    sortByValues: SORT_BY_VALUES,
    normalizeSearch: normalizeSearchTerm,
  });

  const filter = parseFilter(searchParams.get("status"));

  const setFilter = (next: VendorListFilter) => {
    setSkipSkeleton(false);
    updateParams({ status: next === "all" ? null : next }, true);
  };

  const list = useVendorList(
    filter === "all" ? undefined : filter,
    debouncedSearch || undefined,
    page,
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
    isFetching: resolveIsFetching(list.isFetching),
    isError: list.isError,
  };
}
