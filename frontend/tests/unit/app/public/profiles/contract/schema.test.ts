import { describe, expect, it } from "vitest";
import { AddContactSchema, type AddContactValues } from "@/app/(public)/profiles/contract/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

const validContact: AddContactValues = {
  contactName: "สมหญิง ใจดี",
  isMainContact: true,
};

describe("AddContactSchema", () => {
  it("accepts a contact with only the required fields", () => {
    expect(fieldErrorsOf(AddContactSchema, validContact)).toEqual({});
  });

  it("requires a contact name", () => {
    expect(fieldErrorsOf(AddContactSchema, { ...validContact, contactName: "" })).toEqual({
      contactName: ["กรุณากรอกชื่อผู้ติดต่อ"],
    });
  });

  it.each(["", "contact@example.com"])("accepts contact email %j", (contactEmail) => {
    expect(fieldErrorsOf(AddContactSchema, { ...validContact, contactEmail })).toEqual({});
  });

  it.each([undefined, "", "021234567", "081-234-5678"])("accepts contact phone %j", (contactPhone) => {
    expect(fieldErrorsOf(AddContactSchema, { ...validContact, contactPhone })).toEqual({});
  });

  it.each(["08123456", "08123456789", "812345678"])("rejects contact phone %j", (contactPhone) => {
    expect(fieldErrorsOf(AddContactSchema, { ...validContact, contactPhone })).toEqual({
      contactPhone: ["เบอร์โทรไม่ถูกต้อง (ขึ้นต้นด้วย 0 และมี 9-10 หลัก)"],
    });
  });

  it("rejects an invalid contact email", () => {
    expect(fieldErrorsOf(AddContactSchema, { ...validContact, contactEmail: "contact" })).toEqual({
      contactEmail: ["อีเมลไม่ถูกต้อง"],
    });
  });
});
