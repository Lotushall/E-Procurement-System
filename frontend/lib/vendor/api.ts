import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import type {
  SaveVendorContactPayload,
  UpdateVendorDocumentPayload,
  UpdateVendorInfoPayload,
  VendorProfile,
} from "@/lib/vendor/types";

export async function fetchVendorProfile(): Promise<VendorProfile | null> {
  try {
    const { data } = await api.get<{ data: VendorProfile }>(
      "/api/v1/vendor/profile",
    );
    return data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function updateVendorInfo(
  payload: UpdateVendorInfoPayload,
): Promise<void> {
  await api.post("/api/v1/vendor/info", payload);
}

export async function saveVendorContact(
  payload: SaveVendorContactPayload,
): Promise<void> {
  await api.post("/api/v1/vendor/contact", payload);
}

export async function updateVendorDocument(
  payload: UpdateVendorDocumentPayload,
): Promise<void> {
  const formData = new FormData();
  formData.append("documentType", payload.documentType);
  formData.append("file", payload.file);
  await api.post("/api/v1/vendor/document", formData);
}
