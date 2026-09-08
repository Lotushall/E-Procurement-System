import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTenderProject } from "@/lib/tender/tender-projects/api";
import type { CreateTenderProjectPayload } from "@/lib/tender/tender-projects/types";

export function useCreateTenderProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTenderProjectPayload) => createTenderProject(payload),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tenders_projects"] }),
  });
}
