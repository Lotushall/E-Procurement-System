import { useQuery } from "@tanstack/react-query";
import { fetchPermissions } from "@/lib/user/management/api";

export function usePermissions() {
  return useQuery({
    queryKey: ["users", "permissions"],
    queryFn: fetchPermissions,
  });
}
