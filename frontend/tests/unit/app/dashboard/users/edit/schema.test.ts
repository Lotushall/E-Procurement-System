import { describe, expect, it } from "vitest";
import { UpdateAccountSchema, UpdateInternalUserSchema } from "@/app/dashboard/users/edit/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

// ฟอร์มแก้ไขเว้นรหัสผ่านว่างได้ = ไม่เปลี่ยนรหัสผ่าน
describe.each([
  ["UpdateAccountSchema", UpdateAccountSchema, { username: "officer01", email: "officer@example.com" }],
  [
    "UpdateInternalUserSchema",
    UpdateInternalUserSchema,
    { username: "officer01", email: "officer@example.com", role: "procurement_officer", permissions: [] },
  ],
])("%s password", (_name, schema, base) => {
  it.each([undefined, "", "newpass12"])("accepts %j", (password) => {
    expect(fieldErrorsOf(schema, { ...base, password })).toEqual({});
  });

  it("rejects a new password shorter than 8 characters", () => {
    expect(fieldErrorsOf(schema, { ...base, password: "short" })).toEqual({
      password: ["รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"],
    });
  });
});
