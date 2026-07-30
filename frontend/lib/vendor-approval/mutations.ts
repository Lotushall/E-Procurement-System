import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveVendor,
  approveVendorDocument,
  rejectVendor,
  rejectVendorDocument,
} from "@/lib/vendor-approval/api";

function useInvalidateVendors() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["vendors"] });
}

export function useApproveVendor(id: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (remark?: string) => approveVendor(id, remark),
    onSettled: invalidate,
  });
}

export function useRejectVendor(id: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (remark: string) => rejectVendor(id, remark),
    onSettled: invalidate,
  });
}

export function useApproveVendorDocument(vendorId: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (documentId: number) => approveVendorDocument(vendorId, documentId),
    onSettled: invalidate,
  });
}

export function useRejectVendorDocument(vendorId: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: ({ documentId, remark }: { documentId: number; remark: string }) =>
      rejectVendorDocument(vendorId, documentId, remark),
    onSettled: invalidate,
  });
}
