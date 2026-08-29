import { useMutation } from "@tanstack/react-query";
import { deleteVendor } from "@/lib/vendor/approval/api";
import { useInvalidateVendors } from "./useInvalidateVendors";

export function useDeleteVendor() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (id: number) => deleteVendor(id),
    onSettled: invalidate,
  });
}
