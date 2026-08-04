import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchVendorList } from "@/lib/vendor/approval/api";
import type {
  VendorSortBy,
  VendorSortDirection,
  VendorVerificationStatus,
} from "@/lib/vendor/approval/types";

export function useVendorList(
  status?: VendorVerificationStatus,
  search?: string,
  page = 1,
  perPage = 20,
  sortBy?: VendorSortBy,
  sortDirection?: VendorSortDirection,
) {
  return useQuery({
    queryKey: [
      "vendors",
      status ?? "all",
      search ?? "",
      page,
      perPage,
      sortBy ?? "",
      sortDirection ?? "",
    ],
    queryFn: () =>
      fetchVendorList(status, search, page, perPage, sortBy, sortDirection),
    gcTime: search ? 0 : undefined,
    placeholderData: keepPreviousData,
  });
}
