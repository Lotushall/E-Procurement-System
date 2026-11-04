import { describe, expect, it } from "vitest";
import {
  VendorCompanyInfoSchema,
  VendorIndividualInfoSchema,
  type VendorCompanyInfoValues,
  type VendorIndividualInfoValues,
} from "@/app/(public)/profiles/vendor-info/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

// ค่าที่ backend ส่งกลับมาแบบปกปิด — ผู้ใช้ไม่ได้แก้ช่องนี้
const MASKED_ID = "xxxxxxxxx1234";
// เลข 13 หลักที่ check digit ถูก / ผิด
const COMPANY_ID = "0105512345671";
const COMPANY_ID_WRONG_CHECK_DIGIT = "0105512345678";
const CITIZEN_ID = "1103700012346";
const CITIZEN_ID_WRONG_CHECK_DIGIT = "1103700012345";

const validCompany: VendorCompanyInfoValues = {
  companyName: "บริษัท ตัวอย่าง จำกัด",
  businessType: "construction",
  businessRegistrationNo: COMPANY_ID,
  taxId: COMPANY_ID,
  address: "99 ถนนสุขุมวิท",
  province: "กรุงเทพมหานคร",
  postalCode: "10110",
};

const validIndividual: VendorIndividualInfoValues = {
  storeName: "ร้านสมชาย",
  businessType: "retail",
  firstname: "สมชาย",
  lastname: "ใจดี",
  citizenId: CITIZEN_ID,
  address: "1 หมู่ 2",
  province: "เชียงใหม่",
  postalCode: "50000",
};

describe("VendorCompanyInfoSchema", () => {
  it("accepts complete company info", () => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, validCompany)).toEqual({});
  });

  it.each([
    ["companyName", "กรุณากรอกชื่อบริษัท / นิติบุคคล"],
    ["businessType", "กรุณาเลือกประเภทธุรกิจ"],
    ["businessRegistrationNo", "กรุณากรอกเลขทะเบียนนิติบุคคล"],
    ["taxId", "กรุณากรอกเลขผู้เสียภาษี"],
    ["address", "กรุณากรอกที่อยู่"],
    ["province", "กรุณากรอกจังหวัด"],
    ["postalCode", "กรุณากรอกรหัสไปรษณีย์"],
  ])("requires %s", (field, message) => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, [field]: "" })[field]?.[0]).toBe(message);
  });

  it.each([
    ["businessRegistrationNo", "เลขทะเบียนนิติบุคคล"],
    ["taxId", "เลขประจำตัวผู้เสียภาษี"],
  ])("requires %s to be 13 digits", (field, label) => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, [field]: "010551234567" })).toEqual({
      [field]: [`${label}ต้องมี 13 หลัก`],
    });
  });

  it.each([
    ["businessRegistrationNo", "เลขทะเบียนนิติบุคคล"],
    ["taxId", "เลขประจำตัวผู้เสียภาษี"],
  ])("rejects %s with a wrong check digit", (field, label) => {
    expect(
      fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, [field]: COMPANY_ID_WRONG_CHECK_DIGIT }),
    ).toEqual({
      [field]: [`${label}ไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง`],
    });
  });

  it.each(["businessRegistrationNo", "taxId"])("accepts %s typed with dashes", (field) => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, [field]: "0-1055-12345-67-1" })).toEqual({});
  });

  it.each(["businessRegistrationNo", "taxId"])("accepts an untouched masked %s", (field) => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, [field]: MASKED_ID })).toEqual({});
  });

  it("accepts the masked value as the form formats it", () => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, taxId: "X-XXXX-XXXX1-23-4" })).toEqual({});
  });

  it("sends a formatted mask without dashes, since the backend rule only accepts xxxxxxxxx1234", () => {
    const result = VendorCompanyInfoSchema.parse({
      ...validCompany,
      businessRegistrationNo: "X-XXXX-XXXX1-23-4",
      taxId: "x-xxxx-xxxx5-67-8",
    });
    expect(result).toMatchObject({ businessRegistrationNo: "XXXXXXXXX1234", taxId: "xxxxxxxxx5678" });
  });

  it("leaves a real id as typed (the backend strips its dashes)", () => {
    expect(VendorCompanyInfoSchema.parse({ ...validCompany, taxId: "0-1055-12345-67-1" }).taxId).toBe(
      "0-1055-12345-67-1",
    );
  });

  it("does not treat a partly edited mask as untouched", () => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, taxId: "xxxxxxxx51234" })).toEqual({
      taxId: ["เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"],
    });
  });
});

describe("VendorIndividualInfoSchema", () => {
  it("accepts complete individual info", () => {
    expect(fieldErrorsOf(VendorIndividualInfoSchema, validIndividual)).toEqual({});
  });

  it.each([
    ["storeName", "กรุณากรอกชื่อร้านค้า"],
    ["businessType", "กรุณาเลือกประเภทธุรกิจ"],
    ["firstname", "กรุณากรอกชื่อ"],
    ["lastname", "กรุณากรอกนามสกุล"],
    ["citizenId", "กรุณากรอกเลขบัตรประชาชน"],
    ["address", "กรุณากรอกที่อยู่"],
    ["province", "กรุณากรอกจังหวัด"],
    ["postalCode", "กรุณากรอกรหัสไปรษณีย์"],
  ])("requires %s", (field, message) => {
    expect(fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, [field]: "" })[field]?.[0]).toBe(
      message,
    );
  });

  it("requires the citizen id to be 13 digits", () => {
    expect(fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, citizenId: "12345" })).toEqual({
      citizenId: ["เลขบัตรประชาชนต้องมี 13 หลัก"],
    });
  });

  it("rejects a citizen id with a wrong check digit", () => {
    expect(
      fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, citizenId: CITIZEN_ID_WRONG_CHECK_DIGIT }),
    ).toEqual({
      citizenId: ["เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง"],
    });
  });

  it("accepts an untouched masked citizen id", () => {
    expect(fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, citizenId: MASKED_ID })).toEqual({});
  });

  it.each([
    ["citizenId", "X-XXXX-XXXX1-23-4", "XXXXXXXXX1234"],
    ["taxId", "x-xxxx-xxxx5-67-8", "xxxxxxxxx5678"],
  ])("sends a formatted masked %s without dashes", (field, input, sent) => {
    expect(VendorIndividualInfoSchema.parse({ ...validIndividual, [field]: input })[field as "citizenId"]).toBe(sent);
  });

  it("keeps an omitted optional tax id undefined", () => {
    expect(VendorIndividualInfoSchema.parse({ ...validIndividual, taxId: undefined }).taxId).toBeUndefined();
  });

  it.each([undefined, "", CITIZEN_ID, "1-1037-00012-34-6", MASKED_ID])("accepts optional tax id %j", (taxId) => {
    expect(fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, taxId })).toEqual({});
  });

  it("requires a provided tax id to be 13 digits", () => {
    expect(fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, taxId: "12345" })).toEqual({
      taxId: ["เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"],
    });
  });

  it("rejects a provided tax id with a wrong check digit", () => {
    expect(
      fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, taxId: CITIZEN_ID_WRONG_CHECK_DIGIT }),
    ).toEqual({
      taxId: ["เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง"],
    });
  });
});

describe.each([
  ["VendorCompanyInfoSchema", VendorCompanyInfoSchema, validCompany],
  ["VendorIndividualInfoSchema", VendorIndividualInfoSchema, validIndividual],
] as const)("%s postal code", (_name, schema, valid) => {
  it("accepts 5 digits with surrounding spaces", () => {
    expect(fieldErrorsOf(schema, { ...valid, postalCode: " 10110 " })).toEqual({});
  });

  it.each(["1011", "101100", "1O110"])("rejects %j", (postalCode) => {
    expect(fieldErrorsOf(schema, { ...valid, postalCode })).toEqual({
      postalCode: ["รหัสไปรษณีย์ต้องมี 5 หลัก"],
    });
  });
});
