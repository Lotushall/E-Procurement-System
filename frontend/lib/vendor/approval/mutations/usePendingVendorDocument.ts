import { useMutation } from "@tanstack/react-query";
import { pendingVendorDocument } from "@/lib/vendor/approval/api";
import { useInvalidateVendors } from "./useInvalidateVendors";

export function usePendingVendorDocument(vendorId: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (documentId: number) => pendingVendorDocument(vendorId, documentId),
    onSettled: invalidate,
  });
}
