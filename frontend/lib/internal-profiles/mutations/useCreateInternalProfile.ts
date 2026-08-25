import { useMutation } from "@tanstack/react-query";
import { createInternalProfile } from "@/lib/internal-profiles/api";
import type { CreateInternalProfilePayload } from "@/lib/internal-profiles/types";
import { useInvalidateInternalProfiles } from "./useInvalidateInternalProfiles";

export function useCreateInternalProfile() {
  const invalidate = useInvalidateInternalProfiles();
  return useMutation({
    mutationFn: (payload: CreateInternalProfilePayload) => createInternalProfile(payload),
    onSettled: invalidate,
  });
}
