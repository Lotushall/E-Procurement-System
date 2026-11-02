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

  it("lists 'all' then next Buddhist year back through five years", async () => {
    expect(await loadOptions()).toEqual([
      { value: "all", label: "ทุกปีงบประมาณ" },
      { value: "2570", label: "ปีงบประมาณ 2570" },
      { value: "2569", label: "ปีงบประมาณ 2569" },
      { value: "2568", label: "ปีงบประมาณ 2568" },
      { value: "2567", label: "ปีงบประมาณ 2567" },
      { value: "2566", label: "ปีงบประมาณ 2566" },
    ]);
  });
});
