import { useMutation } from "@tanstack/react-query";
import { createDepartment } from "@/lib/internal-profiles/api";
import type { CreateDepartmentPayload } from "@/lib/internal-profiles/types";
import { useInvalidateDepartments } from "./useInvalidateDepartments";

export function useCreateDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) => createDepartment(payload),
    onSettled: invalidate,
  });
}
