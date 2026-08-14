import { useQuery } from "@tanstack/react-query";
import { fetchRoles } from "@/lib/user/management/api";

export function useRoles() {
  return useQuery({
    queryKey: ["users", "roles"],
    queryFn: fetchRoles,
  });
}
