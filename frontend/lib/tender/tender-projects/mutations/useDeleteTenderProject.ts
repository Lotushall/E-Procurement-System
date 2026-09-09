import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTenderProject } from "@/lib/tender/tender-projects/api";

export function useDeleteTenderProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTenderProject(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tenders_projects"] }),
  });
}
