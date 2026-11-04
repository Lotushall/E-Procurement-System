import { describe, expect, it } from "vitest";
import { PROVINCES } from "@/app/(public)/profiles/data/provinces";

describe("PROVINCES", () => {
  it("lists the 76 provinces plus Bangkok", () => {
    expect(PROVINCES).toHaveLength(77);
    expect(PROVINCES).toContain("กรุงเทพมหานคร");
    expect(PROVINCES).toContain("เชียงใหม่");
    expect(PROVINCES).toContain("ภูเก็ต");
  });

  it("has no duplicate values", () => {
    expect(new Set(PROVINCES).size).toBe(PROVINCES.length);
  });

  it("has only trimmed, non-empty names", () => {
    for (const province of PROVINCES) {
      expect(province).not.toBe("");
      expect(province.trim()).toBe(province);
    }
  });
});
