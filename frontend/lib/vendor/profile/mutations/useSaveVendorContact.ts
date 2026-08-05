import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveVendorContact } from "@/lib/vendor/profile/api";
import { VENDOR_PROFILE_QUERY_KEY } from "@/lib/vendor/profile/queries/useVendorProfile";
import type { SaveVendorContactPayload } from "@/lib/vendor/profile/types";

export function useSaveVendorContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveVendorContactPayload) =>
      saveVendorContact(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: VENDOR_PROFILE_QUERY_KEY }),
  });
}
