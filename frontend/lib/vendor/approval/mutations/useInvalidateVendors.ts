import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateVendors() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["vendors"] });
}
