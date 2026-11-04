import { describe, expect, it } from "vitest";
import { BUSINESS_TYPES } from "@/app/(public)/profiles/data/business-types";

describe("BUSINESS_TYPES", () => {
  it("is a non-empty list of non-blank strings", () => {
    expect(BUSINESS_TYPES.length).toBeGreaterThan(0);
    for (const type of BUSINESS_TYPES) {
      expect(typeof type).toBe("string");
      expect(type.trim()).toBe(type);
      expect(type).not.toBe("");
    }
  });

  it("has no duplicate values", () => {
    expect(new Set(BUSINESS_TYPES).size).toBe(BUSINESS_TYPES.length);
  });

  it("ends with the catch-all option", () => {
    expect(BUSINESS_TYPES.at(-1)).toBe("อื่น ๆ");
  });
});
