import { useQuery } from "@tanstack/react-query";
import { fetchVendorDetail } from "@/lib/vendor/approval/api";

export function useVendorDetail(id: number) {
  return useQuery({
    queryKey: ["vendors", "detail", id],
    queryFn: () => fetchVendorDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
