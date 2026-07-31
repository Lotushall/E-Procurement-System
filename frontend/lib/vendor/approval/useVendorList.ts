import { useQuery } from "@tanstack/react-query";
import { fetchVendorList } from "@/lib/vendor/approval/api";
import type { VendorVerificationStatus } from "@/lib/vendor/approval/types";

export function useVendorList(
  status?: VendorVerificationStatus,
  search?: string,
) {
  return useQuery({
    queryKey: ["vendors", status ?? "all", search ?? ""],
    queryFn: () => fetchVendorList(status, search),
    gcTime: search ? 0 : undefined,
  });
}
