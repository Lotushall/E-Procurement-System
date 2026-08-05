import { useMutation } from "@tanstack/react-query";
import { rejectVendor } from "@/lib/vendor/approval/api";
import { useInvalidateVendors } from "./useInvalidateVendors";

export function useRejectVendor(id: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (remark: string) => rejectVendor(id, remark),
    onSettled: invalidate,
  });
}
