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

const validCompany: VendorCompanyInfoValues = {
  companyName: "บริษัท ตัวอย่าง จำกัด",
  businessType: "construction",
  businessRegistrationNo: "0105512345678",
  taxId: "0105512345678",
  address: "99 ถนนสุขุมวิท",
  province: "กรุงเทพมหานคร",
  postalCode: "10110",
};

const validIndividual: VendorIndividualInfoValues = {
  storeName: "ร้านสมชาย",
  businessType: "retail",
  firstname: "สมชาย",
  lastname: "ใจดี",
  citizenId: "1103700012345",
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
    ["businessRegistrationNo", "เลขทะเบียนนิติบุคคลต้องมี 13 หลัก"],
    ["taxId", "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"],
  ])("requires %s to be 13 digits", (field, message) => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, [field]: "010551234567" })).toEqual({
      [field]: [message],
    });
  });

  it.each(["businessRegistrationNo", "taxId"])("accepts %s typed with dashes", (field) => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, [field]: "0-1055-12345-67-8" })).toEqual({});
  });

  it.each(["businessRegistrationNo", "taxId"])("accepts an untouched masked %s", (field) => {
    expect(fieldErrorsOf(VendorCompanyInfoSchema, { ...validCompany, [field]: MASKED_ID })).toEqual({});
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

  it("accepts an untouched masked citizen id", () => {
    expect(fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, citizenId: MASKED_ID })).toEqual({});
  });

  it.each([undefined, "", "1103700012345", "1-1037-00012-34-5", MASKED_ID])(
    "accepts optional tax id %j",
    (taxId) => {
      expect(fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, taxId })).toEqual({});
    },
  );

  it("requires a provided tax id to be 13 digits", () => {
    expect(fieldErrorsOf(VendorIndividualInfoSchema, { ...validIndividual, taxId: "12345" })).toEqual({
      taxId: ["เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"],
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
