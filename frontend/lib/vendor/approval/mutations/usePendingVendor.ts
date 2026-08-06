import { useMutation } from "@tanstack/react-query";
import { pendingVendor } from "@/lib/vendor/approval/api";
import { useInvalidateVendors } from "./useInvalidateVendors";

export function usePendingVendor(id: number) {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: () => pendingVendor(id),
    onSettled: invalidate,
  });
}
