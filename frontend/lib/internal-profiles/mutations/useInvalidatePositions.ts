import { useQueryClient } from "@tanstack/react-query";

export function useInvalidatePositions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["positions"] });
}
