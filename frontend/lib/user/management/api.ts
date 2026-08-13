import { api } from "@/lib/api";
import type {
  PaginatedUserList,
  UserDetail,
  UserSortBy,
  UserSortDirection,
  UserStatus,
  UserType,
} from "@/lib/user/management/types";

export async function fetchUserList(
  type?: UserType,
  status?: UserStatus,
  search?: string,
  page = 1,
  perPage = 20,
  sortBy?: UserSortBy,
  sortDirection?: UserSortDirection,
): Promise<PaginatedUserList> {
  const { data } = await api.get<PaginatedUserList>("/api/v1/dashboard/users", {
    params: {
      type,
      status,
      search,
      page,
      per_page: perPage,
      sort_by: sortBy,
      sort_direction: sortDirection,
    },
  });
  return data;
}

export async function fetchUserDetail(id: number): Promise<UserDetail> {
  const { data } = await api.get<{ data: UserDetail }>(`/api/v1/dashboard/users/${id}`);
  return data.data;
}
