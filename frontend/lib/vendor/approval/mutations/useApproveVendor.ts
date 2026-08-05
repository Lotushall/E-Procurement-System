import { useMutation } from "@tanstack/react-query";
import { approveVendor } from "@/lib/vendor/approval/api";
import { useInvalidateVendors } from "./useInvalidateVendors";

export function useApproveVendor(id: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (remark?: string) => approveVendor(id, remark),
    onSettled: invalidate,
  });
}
