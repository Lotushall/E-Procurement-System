import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchUserList } from "@/lib/user/management/api";
import type {
  UserSortBy,
  UserSortDirection,
  UserStatus,
  UserType,
} from "@/lib/user/management/types";

export function useUserList(
  type?: UserType,
  status?: UserStatus,
  search?: string,
  page = 1,
  perPage = 20,
  sortBy?: UserSortBy,
  sortDirection?: UserSortDirection,
) {
  return useQuery({
    queryKey: [
      "users",
      "list",
      type ?? "all",
      status ?? "all",
      search ?? "",
      page,
      perPage,
      sortBy ?? "",
      sortDirection ?? "",
    ],
    queryFn: () => fetchUserList(type, status, search, page, perPage, sortBy, sortDirection),
    placeholderData: keepPreviousData,
  });
}
