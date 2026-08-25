import { useMutation } from "@tanstack/react-query";
import { updateInternalProfile } from "@/lib/internal-profiles/api";
import type { UpdateInternalProfilePayload } from "@/lib/internal-profiles/types";
import { useInvalidateInternalProfiles } from "./useInvalidateInternalProfiles";

export function useUpdateInternalProfile(id: number) {
  const invalidate = useInvalidateInternalProfiles();
  return useMutation({
    mutationFn: (payload: UpdateInternalProfilePayload) => updateInternalProfile(id, payload),
    onSettled: invalidate,
  });
}
