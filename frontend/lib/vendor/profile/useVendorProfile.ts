import { useQuery } from "@tanstack/react-query";
import { fetchVendorProfile } from "@/lib/vendor/profile/api";

export const VENDOR_PROFILE_QUERY_KEY = ["vendor", "profile"] as const;

export function useVendorProfile(enabled: boolean = true) {
  return useQuery({
    queryKey: VENDOR_PROFILE_QUERY_KEY,
    queryFn: fetchVendorProfile,
    retry: false,
    enabled,
  });
}
