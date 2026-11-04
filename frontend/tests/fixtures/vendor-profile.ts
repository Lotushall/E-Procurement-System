import type {
  VendorContact,
  VendorDocument,
  VendorProfile,
} from "@/lib/vendor/profile/types";
import { makeUser } from "@/tests/fixtures/users";

type CompanyDetail = Extract<VendorProfile["detail"], { type: "company" }>;
type IndividualDetail = Extract<VendorProfile["detail"], { type: "individual" }>;

export function makeVendorContact(overrides: Partial<VendorContact> = {}): VendorContact {
  return {
    id: 1,
    contactName: "สมชาย ใจดี",
    contactPosition: "ผู้จัดการ",
    contactPhone: "0812345678",
    contactEmail: "somchai@example.com",
    lineId: "somchai",
    otherContact: "",
    isMainContact: true,
    ...overrides,
  };
}

export function makeVendorDocument(overrides: Partial<VendorDocument> = {}): VendorDocument {
  return {
    id: 1,
    documentType: "company_certificate",
    fileName: "certificate.pdf",
    filePath: "vendor-documents/certificate.pdf",
    status: "pending",
    verifiedBy: makeUser(),
    verifiedAt: "2026-01-01T00:00:00.000000Z",
    ...overrides,
  };
}

export function makeCompanyVendorProfile(
  overrides: Partial<Omit<VendorProfile, "detail">> & { detail?: Partial<CompanyDetail> } = {},
): VendorProfile {
  const { detail, ...rest } = overrides;
  return {
    id: 1,
    verificationStatus: "pending",
    detail: {
      type: "company",
      companyName: "บริษัท ตัวอย่าง จำกัด",
      businessRegistrationNo: "0105500000003",
      taxId: "0105500000003",
      branchNo: "00000",
      businessType: "ซื้อขาย",
      address: "1 ถนนสุขุมวิท",
      province: "กรุงเทพมหานคร",
      postalCode: "10110",
      ...detail,
    },
    contact: [makeVendorContact()],
    document: [],
    created_at: "2026-01-01T00:00:00.000000Z",
    updated_at: "2026-01-01T00:00:00.000000Z",
    ...rest,
  };
}

export function makeIndividualVendorProfile(
  overrides: Partial<Omit<VendorProfile, "detail">> & { detail?: Partial<IndividualDetail> } = {},
): VendorProfile {
  const { detail, ...rest } = overrides;
  return {
    id: 2,
    verificationStatus: "pending",
    detail: {
      type: "individual",
      storeName: "ร้านตัวอย่าง",
      prefix: "นาย",
      firstname: "สมชาย",
      lastname: "ใจดี",
      citizenId: "1101700000001",
      taxId: "1101700000001",
      businessType: "ซื้อขาย",
      email: "somchai@example.com",
      phone: "0812345678",
      address: "2 ถนนพหลโยธิน",
      province: "กรุงเทพมหานคร",
      postalCode: "10400",
      ...detail,
    },
    contact: [makeVendorContact()],
    document: [],
    created_at: "2026-01-01T00:00:00.000000Z",
    updated_at: "2026-01-01T00:00:00.000000Z",
    ...rest,
  };
}

// ค่าเริ่มต้นเป็นบริษัท; ใช้ makeIndividualVendorProfile สำหรับบุคคลธรรมดา
export function makeVendorProfile(
  overrides: Partial<Omit<VendorProfile, "detail">> & { detail?: Partial<CompanyDetail> } = {},
): VendorProfile {
  return makeCompanyVendorProfile(overrides);
}
