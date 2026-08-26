import { api } from "../api";
import {
  CreateDepartmentPayload,
  CreateInternalProfilePayload,
  CreatePositionPayload,
  Department,
  InternalProfile,
  InternalProfileSortBy,
  InternalProfileSortDirection,
  PaginatedUserList,
  Position,
  UpdateDepartmentPayload,
  UpdateInternalProfilePayload,
  UpdatePositionPayload,
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

export async function createInternalProfile(payload: CreateInternalProfilePayload): Promise<InternalProfile> {
  const { data } = await api.post<{ data: InternalProfile }>("/api/v1/dashboard/internal-profiles", payload);
  return data.data;
}

export async function updateInternalProfile(
  id: number,
  payload: UpdateInternalProfilePayload,
): Promise<InternalProfile> {
  const { data } = await api.patch<{ data: InternalProfile }>(`/api/v1/dashboard/internal-profiles/${id}`, payload);
  return data.data;
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

export async function fetchDepartmentList(): Promise<Department[]> {
  const { data } = await api.get<{ data: Department[] }>("/api/v1/dashboard/departments");
  return data.data;
}

export async function createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
  const { data } = await api.post<{ data: Department }>("/api/v1/dashboard/departments", payload);
  return data.data;
}

export async function updateDepartment(id: number, payload: UpdateDepartmentPayload): Promise<Department> {
  const { data } = await api.patch<{ data: Department }>(`/api/v1/dashboard/departments/${id}`, payload);
  return data.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/departments/${id}`);
}

export async function fetchPositionList(): Promise<Position[]> {
  const { data } = await api.get<{ data: Position[] }>("/api/v1/dashboard/positions");
  return data.data;
}

export async function createPosition(payload: CreatePositionPayload): Promise<Position> {
  const { data } = await api.post<{ data: Position }>("/api/v1/dashboard/positions", payload);
  return data.data;
}

export async function updatePosition(id: number, payload: UpdatePositionPayload): Promise<Position> {
  const { data } = await api.patch<{ data: Position }>(`/api/v1/dashboard/positions/${id}`, payload);
  return data.data;
}

export async function deletePosition(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/positions/${id}`);
}
