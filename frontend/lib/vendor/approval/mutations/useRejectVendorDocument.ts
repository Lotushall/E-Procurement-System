import { useMutation } from "@tanstack/react-query";
import { rejectVendorDocument } from "@/lib/vendor/approval/api";
import { useInvalidateVendors } from "./useInvalidateVendors";

export function useRejectVendorDocument(vendorId: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: ({ documentId, remark }: { documentId: number; remark: string }) =>
      rejectVendorDocument(vendorId, documentId, remark),
    onSettled: invalidate,
  });
}
