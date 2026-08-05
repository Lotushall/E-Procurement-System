import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteVendorDocument } from "@/lib/vendor/profile/api";
import { VENDOR_PROFILE_QUERY_KEY } from "@/lib/vendor/profile/queries/useVendorProfile";

export function useDeleteVendorDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteVendorDocument(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: VENDOR_PROFILE_QUERY_KEY }),
  });
}
