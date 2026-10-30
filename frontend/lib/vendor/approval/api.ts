import { api } from "@/lib/api";
import type { PaginationMeta } from "@/lib/pagination";
import type {
  VendorDetail,
  VendorListParams,
  VendorStatusCounts,
  VendorVerificationStatus,
} from "@/lib/vendor/approval/types";
import { VendorProfile } from "../profile/types";

export interface VendorListResult {
  vendors: VendorProfile[];
  counts: VendorStatusCounts;
  pagination: PaginationMeta;
}

export async function fetchVendorList(
  params: VendorListParams = {},
  page = 1,
  per_page = 20,
): Promise<VendorListResult> {
  const { data } = await api.get<{
    data: VendorProfile[];
    meta: {
      counts: VendorStatusCounts;
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  }>("/api/v1/vendors", {
    params: { ...params, page, per_page },
  });
  return {
    vendors: data.data,
    counts: data.meta.counts,
    pagination: {
      currentPage: data.meta.current_page,
      perPage: data.meta.per_page,
      total: data.meta.total,
      lastPage: data.meta.last_page,
    },
  };
}

export async function fetchVendorCount(
  status: VendorVerificationStatus,
): Promise<number> {
  const { data } = await api.get<{ meta: { total: number } }>(
    "/api/v1/vendors",
    {
      params: { status, per_page: 1 },
    },
  );
  return data.meta.total;
}

export async function fetchVendorDetail(id: number): Promise<VendorDetail> {
  const { data } = await api.get<{ data: VendorDetail }>(
    `/api/v1/vendors/${id}`,
  );
  return data.data;
}

export async function approveVendor(
  id: number,
  remark?: string,
): Promise<void> {
  await api.post(`/api/v1/vendors/${id}/approve`, { remark });
}

export async function rejectVendor(id: number, remark: string): Promise<void> {
  await api.post(`/api/v1/vendors/${id}/reject`, { remark });
}

export async function pendingVendor(id: number): Promise<void> {
  await api.post(`/api/v1/vendors/${id}/pending`);
}

export async function deleteVendor(id: number): Promise<void> {
  await api.delete(`/api/v1/vendors/${id}`);
}

export async function approveVendorDocument(
  vendorId: number,
  documentId: number,
): Promise<void> {
  await api.post(`/api/v1/vendors/${vendorId}/documents/${documentId}/approve`);
}

export async function rejectVendorDocument(
  vendorId: number,
  documentId: number,
  remark: string,
): Promise<void> {
  await api.post(`/api/v1/vendors/${vendorId}/documents/${documentId}/reject`, {
    remark,
  });
}

export async function pendingVendorDocument(
  vendorId: number,
  documentId: number,
): Promise<void> {
  await api.post(`/api/v1/vendors/${vendorId}/documents/${documentId}/pending`);
}
