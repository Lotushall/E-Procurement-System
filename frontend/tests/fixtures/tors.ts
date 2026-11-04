import type { Tor, TorUserSummary } from "@/lib/tender/tor/types";

// รูปแบบที่ GET /dashboard/tors คืน (TorResource) — budgetEstimate เป็น string ทศนิยม 2 ตำแหน่ง
export function makeTor(overrides: Partial<Tor> = {}): Tor {
  return {
    id: 1,
    torCode: "TOR-2569-001",
    title: "จัดซื้อคอมพิวเตอร์โน้ตบุ๊ก",
    scopeOfWork: "จัดซื้อคอมพิวเตอร์โน้ตบุ๊กจำนวน 50 เครื่อง",
    budgetEstimate: "500000.00",
    procurementMethod: "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
    fiscalYear: 2569,
    biddingStartAt: null,
    biddingEndAt: null,
    status: "draft",
    remark: null,
    approvedAt: null,
    createdAt: "2026-01-01T00:00:00.000000Z",
    department: { id: 1, name: "จัดซื้อ" },
    tenderProject: null,
    createdBy: null,
    approvedBy: null,
    ...overrides,
  };
}

// ผู้สร้าง / ผู้อนุมัติ ใน TorResource — { id, name, department }
export function makeTorUserSummary(overrides: Partial<TorUserSummary> = {}): TorUserSummary {
  return { id: 5, name: "สมชาย ใจดี", department: { id: 1, name: "จัดซื้อ" }, ...overrides };
}
