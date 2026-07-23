import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateVendorInfo } from "@/lib/vendor/api";
import { VENDOR_PROFILE_QUERY_KEY } from "@/lib/vendor/useVendorProfile";
import type { UpdateVendorInfoPayload } from "@/lib/vendor/types";

export function useUpdateVendorInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateVendorInfoPayload) => updateVendorInfo(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VENDOR_PROFILE_QUERY_KEY }),
  });
}
