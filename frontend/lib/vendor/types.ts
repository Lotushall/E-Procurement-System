export type VendorVerificationStatus = "pending" | "approved" | "rejected";

interface VendorCompanyProfileDetail {
  type: "company";
  companyName: string;
  businessRegistrationNo: string;
  branchNo: string;
  businessType: string;
  address: string;
  country: string;
  province: string;
  postalCode: string;
}

interface VendorIndividualProfileDetail {
  type: "individual";
  storeName: string;
  prefix: string;
  firstname: string;
  lastname: string;
  businessType: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  province: string;
  postalCode: string;
}

export type VendorProfileDetail = VendorCompanyProfileDetail | VendorIndividualProfileDetail;

export interface VendorProfile {
  id: number;
  verificationStatus: VendorVerificationStatus;
  verifiedAt?: string;
  remark?: string;
  detail: VendorProfileDetail;
}
