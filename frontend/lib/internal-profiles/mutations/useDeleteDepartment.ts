import { useMutation } from "@tanstack/react-query";
import { deleteDepartment } from "@/lib/internal-profiles/api";
import { useInvalidateDepartments } from "./useInvalidateDepartments";

export function useDeleteDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onSettled: invalidate,
  });
}
