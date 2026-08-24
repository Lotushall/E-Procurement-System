import { api } from "../api";
import {
  Department,
  InternalProfileSortBy,
  InternalProfileSortDirection,
  PaginatedUserList,
  Position,
} from "./types";

export async function fetchInternalProfileList(
  page = 1,
  perPage = 20,
  search?: string,
  sortBy?: InternalProfileSortBy,
  sortDirection?: InternalProfileSortDirection,
  departmentId?: number,
  positionId?: number,
): Promise<PaginatedUserList> {
  const { data } = await api.get("/api/v1/dashboard/internal-profiles", {
    params: {
      page,
      per_page: perPage,
      search,
      sort_by: sortBy,
      sort_direction: sortDirection,
      department_id: departmentId,
      position_id: positionId,
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

export async function deleteInternalProfile(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/internal-profiles/${id}`);
}

export async function fetchDepartmentOptions(): Promise<Department[]> {
  const { data } = await api.get("/api/v1/dashboard/departments/select");
  return data.data;
}

export async function fetchPositionOptions(): Promise<Position[]> {
  const { data } = await api.get("/api/v1/dashboard/positions/select");
  return data.data;
}
