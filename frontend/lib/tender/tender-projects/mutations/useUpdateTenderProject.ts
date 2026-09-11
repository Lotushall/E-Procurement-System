import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTenderProject } from "@/lib/tender/tender-projects/api";
import type { UpdateTenderProjectPayload } from "@/lib/tender/tender-projects/types";

export function useUpdateTenderProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTenderProjectPayload }) =>
      updateTenderProject(id, payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tenders_projects"] }),
  });
}
