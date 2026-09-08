import { useQuery } from "@tanstack/react-query";
import { fetchDepartmentList } from "../api";

export function useDepartmentList() {
  return useQuery({
    queryKey: ["departments", "list"],
    queryFn: fetchDepartmentList,
    staleTime: 60 * 60 * 1000,
  });
}
