import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTenderProjectStatus } from "@/lib/tender/tender-projects/api";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";

export function useUpdateTenderProjectStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: TenderProjectStatus) => updateTenderProjectStatus(id, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tenders_projects"] }),
  });
}
