import type {
  TenderProjectOption,
  TenderProjects,
} from "@/lib/tender/tender-projects/types";
import { makeInternalProfile } from "@/tests/fixtures/internal-profiles";

// รูปแบบที่ GET /dashboard/tender-projects คืน (TenderProjectResource) — budget เป็น string ทศนิยม 2 ตำแหน่ง
export function makeTenderProject(overrides: Partial<TenderProjects> = {}): TenderProjects {
  return {
    id: 1,
    projectCode: "TP-2569-001",
    name: "จัดซื้อครุภัณฑ์คอมพิวเตอร์",
    description: "จัดซื้อคอมพิวเตอร์สำหรับสำนักงาน",
    budget: "1000000.00",
    department: { id: 1, name: "จัดซื้อ" },
    personInCharge: makeInternalProfile(),
    procurementMethod: "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
    fiscalYear: 2569,
    projectStartAt: "2026-01-01T00:00:00.000000Z",
    projectEndAt: "2026-12-31T00:00:00.000000Z",
    status: "draft",
    allocatedBudget: "0.00",
    torsCount: 0,
    ...overrides,
  };
}

// GET /dashboard/tender-projects/select
export function makeTenderProjectOption(overrides: Partial<TenderProjectOption> = {}): TenderProjectOption {
  return { id: 1, projectCode: "TP-2569-001", name: "จัดซื้อครุภัณฑ์คอมพิวเตอร์", ...overrides };
}

// meta.stats ของรายการโครงการ
export function makeTenderProjectStats(
  overrides: Partial<{ totalCount: number; totalBudget: number; inProgressCount: number; completedCount: number }> = {},
) {
  return { totalCount: 0, totalBudget: 0, inProgressCount: 0, completedCount: 0, ...overrides };
}
