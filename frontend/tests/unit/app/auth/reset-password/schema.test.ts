import { describe, expect, it } from "vitest";
import { ResetPasswordSchema } from "@/app/(auth)/reset-password/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

describe("ResetPasswordSchema", () => {
  it("accepts matching passwords of at least 8 characters", () => {
    expect(fieldErrorsOf(ResetPasswordSchema, { password: "newpass12", confirmPassword: "newpass12" })).toEqual({});
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(fieldErrorsOf(ResetPasswordSchema, { password: "short", confirmPassword: "short" })).toEqual({
      password: ["รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"],
    });
  });

  // ช่องว่างไม่ตรงกับรหัสผ่านด้วย จึงได้ 2 error — ฟอร์มแสดงตัวแรก
  it("requires the confirmation", () => {
    expect(fieldErrorsOf(ResetPasswordSchema, { password: "newpass12", confirmPassword: "" })).toEqual({
      confirmPassword: ["กรุณายืนยันรหัสผ่าน", "รหัสผ่านไม่ตรงกัน"],
    });
  });

  it("rejects mismatched passwords", () => {
    expect(fieldErrorsOf(ResetPasswordSchema, { password: "newpass12", confirmPassword: "newpass13" })).toEqual({
      confirmPassword: ["รหัสผ่านไม่ตรงกัน"],
    });
  });
});
