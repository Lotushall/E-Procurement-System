import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchVendorList } from "@/lib/vendor/approval/api";
import type { VendorListParams } from "@/lib/vendor/approval/types";

export function useVendorList(params: VendorListParams = {}, page = 1, per_page = 20) {
  return useQuery({
    queryKey: ["vendors", "list", params, page, per_page],
    queryFn: () => fetchVendorList(params, page, per_page),
    gcTime: params.search ? 0 : undefined,
    placeholderData: keepPreviousData,
  });
}
