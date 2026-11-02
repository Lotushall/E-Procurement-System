import { describe, expect, it } from "vitest";
import { AccountInfoSchema, ChangePasswordSchema } from "@/app/(public)/profiles/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

describe("AccountInfoSchema", () => {
  it("accepts a username and valid email", () => {
    expect(fieldErrorsOf(AccountInfoSchema, { username: "vendor01", email: "vendor@example.com" })).toEqual({});
  });

  it("requires a username", () => {
    expect(fieldErrorsOf(AccountInfoSchema, { username: "", email: "vendor@example.com" })).toEqual({
      username: ["กรุณากรอกชื่อผู้ใช้"],
    });
  });

  it("rejects an invalid email", () => {
    expect(fieldErrorsOf(AccountInfoSchema, { username: "vendor01", email: "vendor" })).toEqual({
      email: ["อีเมลไม่ถูกต้อง"],
    });
  });
});

describe("ChangePasswordSchema", () => {
  const valid = { currentPassword: "oldpass12", password: "newpass12", confirmPassword: "newpass12" };

  it("accepts a valid change", () => {
    expect(fieldErrorsOf(ChangePasswordSchema, valid)).toEqual({});
  });

  it("requires the current password", () => {
    expect(fieldErrorsOf(ChangePasswordSchema, { ...valid, currentPassword: "" })).toEqual({
      currentPassword: ["กรุณากรอกรหัสผ่านปัจจุบัน"],
    });
  });

  it("rejects a new password shorter than 8 characters", () => {
    expect(fieldErrorsOf(ChangePasswordSchema, { ...valid, password: "short", confirmPassword: "short" })).toEqual({
      password: ["รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"],
    });
  });

  it("rejects a mismatched confirmation", () => {
    expect(fieldErrorsOf(ChangePasswordSchema, { ...valid, confirmPassword: "newpass13" })).toEqual({
      confirmPassword: ["รหัสผ่านไม่ตรงกัน"],
    });
  });
});
