import { describe, expect, it, vi } from "vitest";
import { freezeTimeAt } from "@/tests/helpers/time";

// รายการปีคำนวณตอนโหลด module — ต้อง import ใหม่หลังล็อกเวลาแล้ว
async function loadOptions() {
  vi.resetModules();
  const { FISCAL_YEAR_OPTIONS } = await import("@/lib/tender/fiscal-year-options");
  return FISCAL_YEAR_OPTIONS;
}

describe("FISCAL_YEAR_OPTIONS", () => {
  freezeTimeAt("2026-11-02T10:00:00+07:00");

  it("lists 'all' then next fiscal year back through five years", async () => {
    expect(await loadOptions()).toEqual([
      { value: "all", label: "ทุกปีงบประมาณ" },
      { value: "2027", label: "ปีงบประมาณ 2027" },
      { value: "2026", label: "ปีงบประมาณ 2026" },
      { value: "2025", label: "ปีงบประมาณ 2025" },
      { value: "2024", label: "ปีงบประมาณ 2024" },
      { value: "2023", label: "ปีงบประมาณ 2023" },
    ]);
  });
});
