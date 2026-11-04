import { useQuery } from "@tanstack/react-query";
import { isPositiveId } from "@/lib/detail-page";
import { fetchVendorDetail } from "@/lib/vendor/approval/api";

export function useVendorDetail(id: number) {
  return useQuery({
    queryKey: ["vendors", "detail", id],
    queryFn: () => fetchVendorDetail(id),
    enabled: isPositiveId(id),
  });
}
