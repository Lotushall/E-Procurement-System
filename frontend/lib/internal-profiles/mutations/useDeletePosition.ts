import { useMutation } from "@tanstack/react-query";
import { deletePosition } from "@/lib/internal-profiles/api";
import { useInvalidatePositions } from "./useInvalidatePositions";

export function useDeletePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: (id: number) => deletePosition(id),
    onSettled: invalidate,
  });
}
