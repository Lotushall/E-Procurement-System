import { describe, expect, it } from "vitest";
import {
  DepartmentFormSchema,
  PositionFormSchema,
} from "@/app/dashboard/internal-employees/departments-positions/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

describe.each([
  ["DepartmentFormSchema", DepartmentFormSchema, "กรุณากรอกชื่อแผนก"],
  ["PositionFormSchema", PositionFormSchema, "กรุณากรอกชื่อตำแหน่ง"],
])("%s", (_name, schema, message) => {
  it("accepts a name", () => {
    expect(fieldErrorsOf(schema, { name: "ฝ่ายพัสดุ" })).toEqual({});
  });

  it("requires a name", () => {
    expect(fieldErrorsOf(schema, { name: "" })).toEqual({ name: [message] });
  });

  it("treats a name of only spaces as empty", () => {
    expect(fieldErrorsOf(schema, { name: "   " })).toEqual({ name: [message] });
  });

  it("sends the name without surrounding spaces", () => {
    expect(schema.parse({ name: "  ฝ่ายพัสดุ  " })).toEqual({ name: "ฝ่ายพัสดุ" });
  });
});
