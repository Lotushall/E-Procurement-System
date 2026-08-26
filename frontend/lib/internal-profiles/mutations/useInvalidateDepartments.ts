import { useQueryClient } from "@tanstack/react-query";

export function useInvalidateDepartments() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["departments"] });
}
