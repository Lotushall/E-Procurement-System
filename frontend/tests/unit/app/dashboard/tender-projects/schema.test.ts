import { describe, expect, it } from "vitest";
import {
  CreateTenderProjectSchema,
  UpdateTenderProjectSchema,
  type CreateTenderProjectFormValues,
} from "@/app/dashboard/tender-projects/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

const validProject: CreateTenderProjectFormValues = {
  name: "จัดซื้อครุภัณฑ์คอมพิวเตอร์",
  budget: "1500000",
  departmentId: "3",
  procurementMethod: "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
  fiscalYear: "2570",
};

// ฟอร์มสร้างและแก้ไขใช้กฎเดียวกัน — รัน test ชุดเดียวกับทั้งสอง schema
describe.each([
  ["CreateTenderProjectSchema", CreateTenderProjectSchema],
  ["UpdateTenderProjectSchema", UpdateTenderProjectSchema],
])("%s", (_name, schema) => {
  it("accepts a project with only the required fields", () => {
    expect(fieldErrorsOf(schema, validProject)).toEqual({});
  });

  it.each([
    ["name", "กรุณากรอกชื่อโครงการ"],
    ["budget", "กรุณากรอกงบประมาณ"],
    ["departmentId", "กรุณาเลือกแผนก"],
    ["procurementMethod", "กรุณาเลือกวิธีจัดซื้อ"],
    ["fiscalYear", "กรุณาเลือกปีงบประมาณ"],
  ])("requires %s", (field, message) => {
    expect(fieldErrorsOf(schema, { ...validProject, [field]: "" })[field]?.[0]).toBe(message);
  });

  it("rejects a name longer than 255 characters", () => {
    expect(fieldErrorsOf(schema, { ...validProject, name: "ก".repeat(256) })).toEqual({
      name: ["ชื่อโครงการต้องไม่เกิน 255 ตัวอักษร"],
    });
  });

  describe("budget", () => {
    it.each(["0.01", "1500000.50", "999999999999.99"])("accepts %j", (budget) => {
      expect(fieldErrorsOf(schema, { ...validProject, budget })).toEqual({});
    });

    it.each(["abc", "1000000000000"])("rejects %j as invalid", (budget) => {
      expect(fieldErrorsOf(schema, { ...validProject, budget })).toEqual({
        budget: ["งบประมาณไม่ถูกต้อง"],
      });
    });

    it.each(["0", "0.00", "-1"])("rejects %j as not above zero", (budget) => {
      expect(fieldErrorsOf(schema, { ...validProject, budget })).toEqual({
        budget: ["งบประมาณต้องมากกว่า 0"],
      });
    });
  });

  describe("project period", () => {
    it("accepts an end date after the start date", () => {
      expect(
        fieldErrorsOf(schema, { ...validProject, projectStartAt: "2026-10-01", projectEndAt: "2027-09-30" }),
      ).toEqual({});
    });

    it("accepts the same start and end date", () => {
      expect(
        fieldErrorsOf(schema, { ...validProject, projectStartAt: "2026-10-01", projectEndAt: "2026-10-01" }),
      ).toEqual({});
    });

    it("accepts only one of the two dates", () => {
      expect(fieldErrorsOf(schema, { ...validProject, projectStartAt: "2026-10-01" })).toEqual({});
      expect(fieldErrorsOf(schema, { ...validProject, projectEndAt: "2027-09-30" })).toEqual({});
    });

    it("rejects an end date before the start date", () => {
      expect(
        fieldErrorsOf(schema, { ...validProject, projectStartAt: "2026-10-01", projectEndAt: "2026-09-30" }),
      ).toEqual({ projectEndAt: ["วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น"] });
    });
  });
});
