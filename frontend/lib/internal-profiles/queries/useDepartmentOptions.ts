import { useQuery } from "@tanstack/react-query";
import { fetchDepartmentOptions } from "../api";

export function useDepartmentOptions() {
  return useQuery({
    queryKey: ["departments", "select"],
    queryFn: fetchDepartmentOptions,
  });
}
