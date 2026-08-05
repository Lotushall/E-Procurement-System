import { useMutation } from "@tanstack/react-query";
import { approveVendorDocument } from "@/lib/vendor/approval/api";
import { useInvalidateVendors } from "./useInvalidateVendors";

export function useApproveVendorDocument(vendorId: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (documentId: number) => approveVendorDocument(vendorId, documentId),
    onSettled: invalidate,
  });
}
