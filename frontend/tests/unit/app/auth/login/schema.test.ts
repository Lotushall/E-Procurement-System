import { describe, expect, it } from "vitest";
import { LoginSchema, type LoginValues } from "@/app/(auth)/login/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

const validLogin: LoginValues = {
  identifier: "officer@example.com",
  password: "secret",
  remember: false,
};

describe("LoginSchema", () => {
  it("accepts a complete login", () => {
    expect(fieldErrorsOf(LoginSchema, validLogin)).toEqual({});
  });

  it("rejects an empty identifier", () => {
    expect(fieldErrorsOf(LoginSchema, { ...validLogin, identifier: "" })).toEqual({
      identifier: ["กรุณากรอกอีเมลหรือชื่อผู้ใช้"],
    });
  });

  it("rejects an empty password", () => {
    expect(fieldErrorsOf(LoginSchema, { ...validLogin, password: "" })).toEqual({
      password: ["กรุณากรอกรหัสผ่าน"],
    });
  });
});
