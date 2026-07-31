import { useEffect, useState } from "react";
import { useVendorList } from "@/lib/vendor/approval/useVendorList";
import type { VendorListFilter } from "../_components/vendor-stats-cards";

const SEARCH_DEBOUNCE_MS = 350;

export function useVendorListPage() {
  const [filter, setFilter] = useState<VendorListFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  const pending = useVendorList("pending");
  const approved = useVendorList("approved");
  const rejected = useVendorList("rejected");
  const list = useVendorList(filter === "all" ? undefined : filter, debouncedSearch || undefined);

  const isPending = pending.isPending || approved.isPending || rejected.isPending || list.isPending;
  const isError = pending.isError || approved.isError || rejected.isError || list.isError;

  const counts: Record<VendorListFilter, number> = {
    all: (pending.data?.length ?? 0) + (approved.data?.length ?? 0) + (rejected.data?.length ?? 0),
    pending: pending.data?.length ?? 0,
    approved: approved.data?.length ?? 0,
    rejected: rejected.data?.length ?? 0,
  };

  return {
    filter,
    setFilter,
    search,
    setSearch,
    debouncedSearch,
    counts,
    visible: list.data ?? [],
    isPending,
    isError,
  };
}
