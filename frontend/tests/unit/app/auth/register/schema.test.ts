import { describe, expect, it } from "vitest";
import { RegisterSchema, type RegisterValues } from "@/app/(auth)/register/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

const shared = {
  phone: "0812345678",
  username: "vendor01",
  email: "vendor@example.com",
  password: "password123",
  confirmPassword: "password123",
  terms: true,
};

const validCompany: RegisterValues = {
  ...shared,
  vendorType: "company",
  companyName: "บริษัท ตัวอย่าง จำกัด",
  taxId: "0105512345678",
};

const validIndividual: RegisterValues = {
  ...shared,
  vendorType: "individual",
  fullName: "สมชาย ใจดี",
  storeName: "ร้านสมชาย",
  idCard: "1103700012345",
};

describe("RegisterSchema — company", () => {
  it("accepts a complete company registration", () => {
    expect(fieldErrorsOf(RegisterSchema, validCompany)).toEqual({});
  });

  it("accepts a tax id typed with dashes", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, taxId: "0-1055-12345-67-8" })).toEqual({});
  });

  it("requires a company name", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, companyName: "   " })).toEqual({
      companyName: ["กรุณากรอกชื่อบริษัท / นิติบุคคล"],
    });
  });

  it.each(["", "010551234567", "01055123456789"])("rejects tax id %j that is not 13 digits", (taxId) => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, taxId })).toEqual({
      taxId: ["เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"],
    });
  });

  it("does not require individual fields", () => {
    const errors = fieldErrorsOf(RegisterSchema, validCompany);
    expect(errors.fullName).toBeUndefined();
    expect(errors.storeName).toBeUndefined();
    expect(errors.idCard).toBeUndefined();
  });
});

describe("RegisterSchema — individual", () => {
  it("accepts a complete individual registration", () => {
    expect(fieldErrorsOf(RegisterSchema, validIndividual)).toEqual({});
  });

  it("requires full name and store name", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validIndividual, fullName: "", storeName: "" })).toEqual({
      fullName: ["กรุณากรอกชื่อ – นามสกุล"],
      storeName: ["กรุณากรอกชื่อร้านค้า"],
    });
  });

  it("rejects an id card that is not 13 digits", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validIndividual, idCard: "12345" })).toEqual({
      idCard: ["เลขบัตรประชาชนต้องมี 13 หลัก"],
    });
  });
});

describe("RegisterSchema — shared fields", () => {
  it.each(["021234567", "081-234-5678"])("accepts phone %j", (phone) => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, phone })).toEqual({});
  });

  it.each([
    ["08123456", "fewer than 9 digits"],
    ["08123456789", "more than 10 digits"],
    ["812345678", "not starting with 0"],
  ])("rejects phone %j (%s)", (phone) => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, phone })).toEqual({
      phone: ["เบอร์ติดต่อไม่ถูกต้อง (ขึ้นต้นด้วย 0 และมี 9-10 หลัก)"],
    });
  });

  it("accepts a one-character username", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, username: "a" })).toEqual({});
  });

  it("requires a username", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, username: "" })).toEqual({
      username: ["กรุณากรอกชื่อผู้ใช้"],
    });
  });

  it("rejects an invalid email", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, email: "not-an-email" })).toEqual({
      email: ["อีเมลไม่ถูกต้อง"],
    });
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, password: "short", confirmPassword: "short" })).toEqual({
      password: ["รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"],
    });
  });

  it("rejects mismatched passwords", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, confirmPassword: "different1" })).toEqual({
      confirmPassword: ["รหัสผ่านไม่ตรงกัน"],
    });
  });

  it("requires accepting the terms", () => {
    expect(fieldErrorsOf(RegisterSchema, { ...validCompany, terms: false })).toEqual({
      terms: ["กรุณายอมรับข้อกำหนดและเงื่อนไข"],
    });
  });
});
