import { useMutation } from "@tanstack/react-query";
import { createPosition } from "@/lib/internal-profiles/api";
import type { CreatePositionPayload } from "@/lib/internal-profiles/types";
import { useInvalidatePositions } from "./useInvalidatePositions";

export function useCreatePosition() {
  const invalidate = useInvalidatePositions();
  return useMutation({
    mutationFn: (payload: CreatePositionPayload) => createPosition(payload),
    onSettled: invalidate,
  });
}
