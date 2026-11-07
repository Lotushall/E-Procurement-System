import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateTorPayload } from "../types";
import { createTor } from "../api";

export function useCreateTor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTorPayload) => createTor(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tors"] }),
  });
}
