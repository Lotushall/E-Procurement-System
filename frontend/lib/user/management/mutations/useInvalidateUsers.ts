import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["users"] });
}
