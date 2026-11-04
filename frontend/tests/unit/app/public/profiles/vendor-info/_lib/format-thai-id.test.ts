import { describe, expect, it } from "vitest";
import { formatThaiId } from "@/app/(public)/profiles/vendor-info/_lib/format-thai-id";

describe("formatThaiId", () => {
  it("groups 13 digits as X-XXXX-XXXXX-XX-X", () => {
    expect(formatThaiId("0105512345671")).toBe("0-1055-12345-67-1");
  });

  it("groups progressively while the user is still typing", () => {
    expect(formatThaiId("")).toBe("");
    expect(formatThaiId("0")).toBe("0");
    expect(formatThaiId("01055")).toBe("0-1055");
    expect(formatThaiId("010551")).toBe("0-1055-1");
    expect(formatThaiId("0105512345")).toBe("0-1055-12345");
    expect(formatThaiId("01055123456")).toBe("0-1055-12345-6");
    expect(formatThaiId("010551234567")).toBe("0-1055-12345-67");
  });

  it("keeps X placeholders and upper-cases lowercase x", () => {
    expect(formatThaiId("xxxxxxxxx1234")).toBe("X-XXXX-XXXX1-23-4");
    expect(formatThaiId("X-XXXX-XXXX1-23-4")).toBe("X-XXXX-XXXX1-23-4");
  });

  it("drops every character that is not a digit or X", () => {
    expect(formatThaiId(" 0-1055 abc 12345.67/1 ")).toBe("0-1055-12345-67-1");
  });

  it("stops at 13 characters", () => {
    expect(formatThaiId("01055123456719999")).toBe("0-1055-12345-67-1");
  });

  it("is idempotent on already formatted input", () => {
    const once = formatThaiId("1103700012346");
    expect(formatThaiId(once)).toBe(once);
  });
});
