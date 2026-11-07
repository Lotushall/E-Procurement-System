import { describe, expect, it } from "vitest";
import { CreateUserSchema, type CreateUserValues } from "@/app/dashboard/users/create/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

const validUser: CreateUserValues = {
  username: "officer01",
  email: "officer@example.com",
  password: "password123",
  internalProfileId: "7",
  role: "procurement_officer",
  permissions: [],
};

describe("CreateUserSchema", () => {
  it("accepts a complete user", () => {
    expect(fieldErrorsOf(CreateUserSchema, validUser)).toEqual({});
  });

  it.each([
    ["username", "กรุณากรอก username"],
    ["internalProfileId", "กรุณาเลือกพนักงาน"],
    ["role", "กรุณาเลือก role"],
  ])("requires %s", (field, message) => {
    expect(fieldErrorsOf(CreateUserSchema, { ...validUser, [field]: "" })).toEqual({ [field]: [message] });
  });

  it("requires a password of at least 8 characters", () => {
    expect(fieldErrorsOf(CreateUserSchema, { ...validUser, password: "" })).toEqual({
      password: ["รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"],
    });
  });
});
