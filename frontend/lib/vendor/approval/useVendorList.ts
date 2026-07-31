import { useQuery } from "@tanstack/react-query";
import { fetchVendorList } from "@/lib/vendor/approval/api";
import type { VendorVerificationStatus } from "@/lib/vendor/approval/types";

export function useVendorList(status: VendorVerificationStatus) {
  return useQuery({
    queryKey: ["vendors", status],
    queryFn: () => fetchVendorList(status),
  });
}
