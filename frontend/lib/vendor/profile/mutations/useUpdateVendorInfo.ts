import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { updateVendorInfo } from "@/lib/vendor/profile/api";
import { VENDOR_PROFILE_QUERY_KEY } from "@/lib/vendor/profile/queries/useVendorProfile";
import type { UpdateVendorInfoPayload } from "@/lib/vendor/profile/types";

export const UPDATE_VENDOR_INFO_MUTATION_KEY = [
  "vendor",
  "info",
  "update",
] as const;

export function useUpdateVendorInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: UPDATE_VENDOR_INFO_MUTATION_KEY,
    mutationFn: (payload: UpdateVendorInfoPayload) => updateVendorInfo(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: VENDOR_PROFILE_QUERY_KEY }),
  });
}

/**
 * Whether a vendor-info save is in flight, observable from anywhere in the
 * app (e.g. vendor-info/page.tsx) without needing a reference to the
 * CompanyInfoForm/IndividualInfoForm component that actually triggered it.
 */
export function useIsVendorInfoSubmitting() {
  return useIsMutating({ mutationKey: UPDATE_VENDOR_INFO_MUTATION_KEY }) > 0;
}
