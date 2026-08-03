import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchVendorList } from "@/lib/vendor/approval/api";
import type { VendorVerificationStatus } from "@/lib/vendor/approval/types";

export function useVendorList(
  status?: VendorVerificationStatus,
  search?: string,
  page = 1,
  perPage = 20,
) {
  return useQuery({
    queryKey: ["vendors", status ?? "all", search ?? "", page, perPage],
    queryFn: () => fetchVendorList(status, search, page, perPage),
    gcTime: search ? 0 : undefined,
    placeholderData: keepPreviousData,
  });
}
