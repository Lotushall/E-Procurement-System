import { api } from "@/lib/api";
import {
  CreateTenderProjectPayload,
  PaginatedTenderProjectsList,
  TenderProjectListParams,
  TenderProjectOption,
  TenderProjectOptionsParams,
  TenderProjects,
  TenderProjectStatus,
  UpdateTenderProjectPayload,
} from "./types";

export async function fetchTenderProjectsList(
  params: TenderProjectListParams = {},
  page = 1,
  per_page = 20,
): Promise<PaginatedTenderProjectsList> {
  const { data } = await api.get("/api/v1/dashboard/tender-projects", {
    params: { ...params, page, per_page },
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

export async function fetchTenderProjectOptions(
  params: TenderProjectOptionsParams = {},
): Promise<TenderProjectOption[]> {
  const { data } = await api.get<{ data: TenderProjectOption[] }>(
    "/api/v1/dashboard/tender-projects/select",
    // Laravel's boolean rule takes 1/0, not "true"/"false"
    { params: { ...params, open_for_tor: params.open_for_tor ? 1 : undefined } },
  );
  return data.data;
}
