import { useEffect, useState } from "react";
import type { PaginationState } from "@tanstack/react-table";
import { useVendorList } from "@/lib/vendor/approval/useVendorList";
import type { VendorListFilter } from "../_components/vendor-stats-cards";

const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 20 };

export function useVendorListPage() {
  const [filter, setFilter] = useState<VendorListFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [search]);

  const queryKey = `${filter}:${debouncedSearch}`;
  const [prevQueryKey, setPrevQueryKey] = useState(queryKey);
  if (queryKey !== prevQueryKey) {
    setPrevQueryKey(queryKey);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  const list = useVendorList(
    filter === "all" ? undefined : filter,
    debouncedSearch || undefined,
    pagination.pageIndex + 1,
    pagination.pageSize,
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
    pagination,
    setPagination,
    isPending: list.isPending,
    isError: list.isError,
  };
}
