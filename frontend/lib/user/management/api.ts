// These endpoints are a designed-but-not-yet-implemented backend contract.
// See docs/superpowers/specs/2026-08-13-user-management-list-design.md (list/detail)
// and docs/superpowers/specs/2026-08-14-user-management-create-edit-design.md (create/edit/status/roles).
// Requests will fail until the backend API plan(s) ship.
import { api } from "@/lib/api";
import type {
  CreateUserPayload,
  PaginatedUserList,
  Role,
  UpdateUserPayload,
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
  return {
    data: data.data,
    meta: {
      currentPage: data.meta.currentPage,
      lastPage: data.meta.lastPage,
      perPage: data.meta.perPage,
      total: data.meta.total,
    },
  };
}

export async function fetchUserDetail(id: number): Promise<UserDetail> {
  const { data } = await api.get<{ data: UserDetail }>(`/api/v1/dashboard/users/${id}`);
  return data.data;
}

export async function createUser(payload: CreateUserPayload): Promise<UserDetail> {
  const { data } = await api.post<{ data: UserDetail }>("/api/v1/dashboard/users", payload);
  return data.data;
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<UserDetail> {
  const { data } = await api.patch<{ data: UserDetail }>(`/api/v1/dashboard/users/${id}`, payload);
  return data.data;
}

export async function updateUserStatus(id: number, status: UserStatus): Promise<UserStatus> {
  const { data } = await api.patch<{ data: { status: UserStatus } }>(
    `/api/v1/dashboard/users/${id}/status`,
    { status },
  );
  return data.data.status;
}

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await api.get<{ data: Role[] }>("/api/v1/dashboard/roles");
  return data.data;
}
