import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TorCard } from "@/app/dashboard/tors/_components/table/tor-card";
import { routes } from "@/lib/routes";
import type { Tor } from "@/lib/tender/tor/types";
import { makeTor } from "@/tests/fixtures/tors";
import { freezeTimeAt } from "@/tests/helpers/time";

freezeTimeAt("2026-11-02T10:00:00+07:00");

function setup(tor: Partial<Tor> = {}) {
  render(<TorCard tor={makeTor(tor)} />);
  return screen.getByRole("article");
}

describe("TorCard — content", () => {
  it("shows the code beside the status badge", () => {
    const card = setup({ torCode: "TOR-2569-042", status: "approved" });

    expect(card).toHaveTextContent("TOR-2569-042");
    expect(card).toHaveTextContent("อนุมัติแล้ว");
  });

  it("links the title and department to the TOR detail page", () => {
    const card = setup({ id: 42, title: "จัดซื้อโต๊ะ", department: { id: 3, name: "บัญชี" } });

    const link = within(card).getByRole("link");
    expect(link).toHaveAttribute("href", routes.dashboards.tors.detail(42));
    expect(link).toHaveTextContent("จัดซื้อโต๊ะ");
    expect(link).toHaveTextContent("บัญชี");
  });

  it("shows the fiscal year and the budget", () => {
    const card = setup({ fiscalYear: 2570, budgetEstimate: "1250000.00" });

    expect(card).toHaveTextContent("ราคากลาง · ปี 2570");
    expect(card).toHaveTextContent("1,250,000");
  });

  it("keeps the satang of the budget", () => {
    const card = setup({ budgetEstimate: "500000.55" });

    expect(card).toHaveTextContent("500,000.55");
  });

  it("shows the procurement method in the footer", () => {
    const card = setup({ procurementMethod: "คัดเลือก" });

    expect(card).toHaveTextContent("คัดเลือก");
  });
});

describe("TorCard — bidding window", () => {
  it("says the window is not set for a TOR without bidding dates", () => {
    const card = setup({ biddingStartAt: null, biddingEndAt: null });

    expect(card).toHaveTextContent("ยังไม่กำหนด");
  });

  it("shows the range and the days left for a TOR that is open for bids", () => {
    const card = setup({
      status: "bidding",
      biddingStartAt: "2026-11-01T09:00:00+07:00",
      biddingEndAt: "2026-11-20T16:00:00+07:00",
    });

    expect(card).toHaveTextContent("1 พ.ย. – 20 พ.ย. 26");
    expect(card).toHaveTextContent("เหลือ 18 วัน");
  });

  it("shows a published TOR's countdown to the start of bidding", () => {
    const card = setup({
      status: "published",
      biddingStartAt: "2026-11-05T09:00:00+07:00",
      biddingEndAt: "2026-11-20T16:00:00+07:00",
    });

    expect(card).toHaveTextContent("เริ่มรับซองในอีก 3 วัน");
  });
});

describe("TorCard — tender project", () => {
  // การ์ดบนจอเล็กไม่แสดงโครงการ ต่างจากตาราง — ยืนยันว่าไม่มีลิงก์ไปโครงการโดยไม่ตั้งใจ
  it("links only to the TOR, not to its tender project", () => {
    const card = setup({ tenderProject: { id: 7, projectCode: "TP-2569-007", name: "จัดซื้อคอมพิวเตอร์" } });

    expect(within(card).getAllByRole("link")).toHaveLength(1);
  });
});
