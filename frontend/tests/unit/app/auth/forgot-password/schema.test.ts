import { describe, expect, it } from "vitest";
import { ForgotPasswordSchema } from "@/app/(auth)/forgot-password/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

describe("ForgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(fieldErrorsOf(ForgotPasswordSchema, { email: "vendor@example.com" })).toEqual({});
  });

  it.each(["", "vendor", "vendor@"])("rejects email %j", (email) => {
    expect(fieldErrorsOf(ForgotPasswordSchema, { email })).toEqual({
      email: ["กรุณากรอกอีเมลให้ถูกต้อง"],
    });
  });
});
