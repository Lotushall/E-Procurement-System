import { describe, expect, it } from "vitest";
import { PermissionFormSchema } from "@/app/dashboard/users/roles-permissions/_schemas/permission-schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

const NAME_FORMAT_MESSAGE =
  "รูปแบบต้องเป็น prefix.action เช่น reports.export (prefix ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น ส่วน action อนุญาตตัวพิมพ์ใหญ่ได้ เช่น updateStatus)";

describe("PermissionFormSchema", () => {
  it.each(["reports.export", "tor.updateStatus", "tender_projects.view", "level2.approve_all"])(
    "accepts permission name %j",
    (name) => {
      expect(fieldErrorsOf(PermissionFormSchema, { name, label: "Label" })).toEqual({});
    },
  );

  it.each(["reports", "Reports.export", "reports.Export", "reports.export.all", "reports-x.export", ".export"])(
    "rejects permission name %j",
    (name) => {
      expect(fieldErrorsOf(PermissionFormSchema, { name, label: "Label" })).toEqual({
        name: [NAME_FORMAT_MESSAGE],
      });
    },
  );

  it("requires a name", () => {
    expect(fieldErrorsOf(PermissionFormSchema, { name: "", label: "Label" }).name).toContain(
      "กรุณากรอกชื่อ permission",
    );
  });

  it("requires a label", () => {
    expect(fieldErrorsOf(PermissionFormSchema, { name: "reports.export", label: "" })).toEqual({
      label: ["กรุณากรอก label"],
    });
  });
});
