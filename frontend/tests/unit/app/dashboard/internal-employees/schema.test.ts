import { describe, expect, it } from "vitest";
import { InternalProfileFormSchema } from "@/app/dashboard/internal-employees/_schemas/schema";
import { fieldErrorsOf } from "@/tests/helpers/zod";

describe("InternalProfileFormSchema", () => {
  it("accepts a profile with only first and last name", () => {
    expect(fieldErrorsOf(InternalProfileFormSchema, { firstname: "สมชาย", lastname: "ใจดี" })).toEqual({});
  });

  it("requires first and last name", () => {
    expect(fieldErrorsOf(InternalProfileFormSchema, { firstname: "", lastname: "" })).toEqual({
      firstname: ["กรุณากรอกชื่อ"],
      lastname: ["กรุณากรอกนามสกุล"],
    });
  });
});
