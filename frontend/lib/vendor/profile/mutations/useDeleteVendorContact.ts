import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteVendorContact } from "@/lib/vendor/profile/api";
import { VENDOR_PROFILE_QUERY_KEY } from "@/lib/vendor/profile/queries/useVendorProfile";

export function useDeleteVendorContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteVendorContact(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: VENDOR_PROFILE_QUERY_KEY }),
  });
}
