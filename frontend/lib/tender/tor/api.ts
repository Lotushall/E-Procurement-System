import { api } from "@/lib/api";
import { PaginatedTorsList, Tor, TorListParams } from "./types";

export async function fetchTorsList(
  params: TorListParams = {},
  page = 1,
  per_page = 20,
): Promise<PaginatedTorsList> {
  const { data } = await api.get("/api/v1/dashboard/tors", {
    params: { ...params, page, per_page },
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

export async function fetchTorDetail(id: number): Promise<Tor> {
  const { data } = await api.get<{ data: Tor }>(`/api/v1/dashboard/tors/${id}`);
  return data.data;
}
