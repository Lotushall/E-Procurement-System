import { describe, expect, it } from "vitest";
import { PROCUREMENT_METHODS } from "@/lib/tender/procurement-methods";

describe("PROCUREMENT_METHODS", () => {
  it("lists the four procurement methods in display order", () => {
    expect(PROCUREMENT_METHODS).toEqual([
      "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
      "ตลาดอิเล็กทรอนิกส์ (e-market)",
      "คัดเลือก",
      "เฉพาะเจาะจง",
    ]);
  });

  it("has no duplicates", () => {
    expect(new Set(PROCUREMENT_METHODS).size).toBe(PROCUREMENT_METHODS.length);
  });
});
