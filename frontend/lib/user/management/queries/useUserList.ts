import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchUserList } from "@/lib/user/management/api";
import type { UserListParams } from "@/lib/user/management/types";

export function useUserList(params: UserListParams = {}, page = 1, per_page = 20) {
  return useQuery({
    queryKey: ["users", "list", params, page, per_page],
    queryFn: () => fetchUserList(params, page, per_page),
    placeholderData: keepPreviousData,
  });
}
