import { api } from "@/lib/api";
import {
  CreateTenderProjectPayload,
  PaginatedTenderProjectsList,
  TenderProjects,
  TenderProjectSortBy,
  TenderProjectSortDirection,
  TenderProjectStatus,
  UpdateTenderProjectPayload,
} from "./types";

export async function fetchTenderProjectsList(
  search?: string,
  status?: string,
  department_id?: number,
  fiscal_year?: string,
  date_from?: string,
  date_to?: string,
  sort_by?: TenderProjectSortBy,
  sort_direction?: TenderProjectSortDirection,
  page = 1,
  per_page = 20,
): Promise<PaginatedTenderProjectsList> {
  const { data } = await api.get("/api/v1/dashboard/tender-projects", {
    params: {
      search,
      status,
      department_id,
      fiscal_year,
      date_from,
      date_to,
      sort_by,
      sort_direction,
      page,
      per_page,
    },
  });

  return {
    data: data.data,
    meta: {
      currentPage: data.meta.currentPage,
      lastPage: data.meta.lastPage,
      perPage: data.meta.perPage,
      total: data.meta.total,
      stats: data.meta.stats,
    },
  };
}

export async function createTenderProject(
  payload: CreateTenderProjectPayload,
): Promise<{ projectCode: string }> {
  const { data } = await api.post<{ data: { projectCode: string } }>(
    "/api/v1/dashboard/tender-projects",
    payload,
  );
  return data.data;
}

export async function fetchTenderProjectDetail(id: number): Promise<TenderProjects> {
  const { data } = await api.get<{ data: TenderProjects }>(
    `/api/v1/dashboard/tender-projects/${id}`,
  );
  return data.data;
}

export async function updateTenderProject(
  id: number,
  payload: UpdateTenderProjectPayload,
): Promise<{ projectCode: string }> {
  const { data } = await api.put<{ data: { projectCode: string } }>(
    `/api/v1/dashboard/tender-projects/${id}`,
    payload,
  );
  return data.data;
}

export async function updateTenderProjectStatus(
  id: number,
  status: TenderProjectStatus,
): Promise<TenderProjectStatus> {
  const { data } = await api.patch<{ data: TenderProjects }>(
    `/api/v1/dashboard/tender-projects/${id}/status`,
    { status },
  );
  return data.data.status;
}

export async function deleteTenderProject(id: number): Promise<void> {
  await api.delete(`/api/v1/dashboard/tender-projects/${id}`);
}
