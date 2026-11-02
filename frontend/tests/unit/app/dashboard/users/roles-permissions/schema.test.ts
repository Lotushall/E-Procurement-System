import { describe, expect, it } from "vitest";
import { RoleFormSchema } from "@/app/dashboard/users/roles-permissions/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

const NAME_FORMAT_MESSAGE = "ใช้ได้แค่ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)";

describe("RoleFormSchema", () => {
  it.each(["admin", "procurement_officer", "level2_approver"])("accepts role name %j", (name) => {
    expect(fieldErrorsOf(RoleFormSchema, { name, permissions: ["tor.view"] })).toEqual({});
  });

  it.each(["Admin", "1admin", "_admin", "procurement-officer", "procurement officer"])(
    "rejects role name %j",
    (name) => {
      expect(fieldErrorsOf(RoleFormSchema, { name, permissions: ["tor.view"] })).toEqual({
        name: [NAME_FORMAT_MESSAGE],
      });
    },
  );

  it("requires a name", () => {
    expect(fieldErrorsOf(RoleFormSchema, { name: "", permissions: ["tor.view"] }).name).toContain(
      "กรุณากรอกชื่อ role",
    );
  });

  it("requires at least one permission", () => {
    expect(fieldErrorsOf(RoleFormSchema, { name: "admin", permissions: [] })).toEqual({
      permissions: ["กรุณาเลือกอย่างน้อย 1 permission"],
    });
  });
});
