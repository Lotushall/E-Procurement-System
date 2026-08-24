import { useMutation } from "@tanstack/react-query";
import { deleteInternalProfile } from "@/lib/internal-profiles/api";
import { useInvalidateInternalProfiles } from "./useInvalidateInternalProfiles";

export function useDeleteInternalProfile() {
  const invalidate = useInvalidateInternalProfiles();
  return useMutation({
    mutationFn: (id: number) => deleteInternalProfile(id),
    onSettled: invalidate,
  });
}
