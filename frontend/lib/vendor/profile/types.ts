import { User } from "@/lib/user/types";

export type VendorVerificationStatus = "pending" | "approved" | "rejected";

interface VendorCompanyProfileDetail {
  type: "company";
  companyName: string;
  businessRegistrationNo: string;
  taxId: string;
  branchNo: string;
  businessType: string;
  address: string;
  province: string;
  postalCode: string;
}

interface VendorIndividualProfileDetail {
  type: "individual";
  storeName: string;
  prefix: string;
  firstname: string;
  lastname: string;
  citizenId: string;
  taxId: string;
  businessType: string;
  email: string;
  phone: string;
  address: string;
  province: string;
  postalCode: string;
}

export interface VendorDocument {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  status: string;
  verifiedBy: User;
  verifiedAt: string;
  remark?: string;
}
export interface VendorContact {
  id: number;
  contactName: string;
  contactPosition: string;
  contactPhone: string;
  contactEmail: string;
  lineId: string;
  otherContact: string;
  isMainContact: string;
}

export type VendorProfileDetail =
  | VendorCompanyProfileDetail
  | VendorIndividualProfileDetail;

export interface VendorProfile {
  id: number;
  verificationStatus: VendorVerificationStatus;
  verifiedAt?: string;
  remark?: string;
  detail: VendorProfileDetail;
  contact: VendorContact[];
  document?: VendorDocument[];
  documentStatusCounts?: {
    approved: number;
    pending: number;
    rejected: number;
  };
  created_at: string;
  updated_at: string;
}

export interface SaveVendorContactPayload {
  id?: number;
  contactName: string;
  contactPosition?: string;
  contactPhone?: string;
  contactEmail?: string;
  lineId?: string;
  otherContact?: string;
  isMainContact: boolean;
}

export interface UpdateVendorDocumentPayload {
  documentType: string;
  file: File;
  signal?: AbortSignal;
  onUploadProgress?: (percent: number) => void;
}

export interface UpdateVendorInfoPayload {
  vendorType: "company" | "individual";
  companyName?: string;
  businessRegistrationNo?: string;
  branchNo?: string;
  storeName?: string;
  prefix?: string;
  firstname?: string;
  lastname?: string;
  citizenId?: string;
  businessType: string;
  taxId?: string;
  address: string;
  province: string;
  postalCode: string;
}
