import { useMutation } from "@tanstack/react-query";
import { updateDepartment } from "@/lib/internal-profiles/api";
import type { UpdateDepartmentPayload } from "@/lib/internal-profiles/types";
import { useInvalidateDepartments } from "./useInvalidateDepartments";

export function useUpdateDepartment(id: number) {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (payload: UpdateDepartmentPayload) => updateDepartment(id, payload),
    onSettled: invalidate,
  });
}
