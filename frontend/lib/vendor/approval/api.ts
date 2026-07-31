import { api } from "@/lib/api";
import type {
  VendorDetail,
  VendorSummary,
  VendorVerificationStatus,
} from "@/lib/vendor/approval/types";

export async function fetchVendorList(
  status?: VendorVerificationStatus,
  search?: string,
): Promise<VendorSummary[]> {
  const { data } = await api.get<{ data: VendorSummary[] }>("/api/v1/vendors", {
    params: { status, search },
  });
  return data.data;
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
