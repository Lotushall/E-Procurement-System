import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateInternalProfiles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["internal_profiles"] });
}
