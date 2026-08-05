import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveVendorDocument } from "@/lib/vendor/profile/api";
import { VENDOR_PROFILE_QUERY_KEY } from "@/lib/vendor/profile/queries/useVendorProfile";
import type { UpdateVendorDocumentPayload } from "@/lib/vendor/profile/types";

export function useSaveVendorDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateVendorDocumentPayload) =>
      saveVendorDocument(payload),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: VENDOR_PROFILE_QUERY_KEY }),
  });
}
