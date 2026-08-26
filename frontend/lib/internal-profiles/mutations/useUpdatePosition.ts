import { useMutation } from "@tanstack/react-query";
import { updatePosition } from "@/lib/internal-profiles/api";
import type { UpdatePositionPayload } from "@/lib/internal-profiles/types";
import { useInvalidatePositions } from "./useInvalidatePositions";

export function useUpdatePosition(id: number) {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: (payload: UpdatePositionPayload) => updatePosition(id, payload),
    onSettled: invalidate,
  });
}
