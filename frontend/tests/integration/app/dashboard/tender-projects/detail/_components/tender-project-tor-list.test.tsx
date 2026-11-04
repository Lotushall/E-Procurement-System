import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TenderProjectTorList } from "@/app/dashboard/tender-projects/detail/_components/tender-project-tor-list";
import { routes } from "@/lib/routes";
import { makeTor } from "@/tests/fixtures/tors";
import { freezeTimeAt } from "@/tests/helpers/time";

freezeTimeAt("2026-11-02T10:00:00+07:00");

const OPEN = makeTor({
  id: 11,
  torCode: "TOR-2026-001",
  title: "จัดซื้อโน้ตบุ๊ก",
  procurementMethod: "e-bidding",
  budgetEstimate: "1234567.50",
  status: "published",
  biddingStartAt: "2026-11-10T09:00:00+07:00",
  biddingEndAt: "2026-11-20T16:00:00+07:00",
});
const DRAFT = makeTor({
  id: 12,
  torCode: "TOR-2026-002",
  title: "จัดซื้อโต๊ะ",
  procurementMethod: "วิธีเฉพาะเจาะจง",
  budgetEstimate: "5000.00",
  status: "draft",
});

describe("TenderProjectTorList", () => {
  it("shows the empty state and no table or list when there are no TORs", () => {
    render(<TenderProjectTorList tors={[]} />);

    expect(screen.getByText("ยังไม่มี TOR ภายใต้โครงการนี้")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders the table headers", () => {
    render(<TenderProjectTorList tors={[OPEN]} />);

    const headers = within(screen.getByRole("table")).getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual([
      "รหัส TOR",
      "ชื่อ TOR",
      "วิธีจัดซื้อจัดจ้าง",
      "ราคากลาง",
      "ช่วงรับซอง",
      "สถานะ",
    ]);
  });

  it("renders one table row per TOR with code, title, method, budget, bidding hint and status", () => {
    render(<TenderProjectTorList tors={[OPEN, DRAFT]} />);

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);

    const first = within(rows[0]);
    expect(first.getByRole("link", { name: "TOR-2026-001" })).toBeInTheDocument();
    expect(first.getByRole("link", { name: "จัดซื้อโน้ตบุ๊ก" })).toBeInTheDocument();
    expect(first.getByText("e-bidding")).toBeInTheDocument();
    expect(first.getByText("1,234,567.5")).toBeInTheDocument();
    expect(first.getByText("เริ่มรับซองในอีก 8 วัน")).toBeInTheDocument();
    expect(first.getByText("ประกาศแล้ว")).toBeInTheDocument();

    const second = within(rows[1]);
    expect(second.getByRole("link", { name: "TOR-2026-002" })).toBeInTheDocument();
    expect(second.getByText("5,000")).toBeInTheDocument();
    expect(second.getByText("ยังไม่กำหนด")).toBeInTheDocument();
    expect(second.getByText("ร่าง")).toBeInTheDocument();
  });

  it("links the code and title in the table to the TOR detail page", () => {
    render(<TenderProjectTorList tors={[OPEN]} />);

    const table = within(screen.getByRole("table"));
    expect(table.getByRole("link", { name: "TOR-2026-001" })).toHaveAttribute("href", routes.dashboards.tors.detail(11));
    expect(table.getByRole("link", { name: "จัดซื้อโน้ตบุ๊ก" })).toHaveAttribute("href", routes.dashboards.tors.detail(11));
  });

  it("renders the small-screen list with code, title link, method, budget, bidding hint and status", () => {
    render(<TenderProjectTorList tors={[OPEN, DRAFT]} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    const first = within(items[0]);
    expect(first.getByText("TOR-2026-001")).toBeInTheDocument();
    expect(first.getByRole("link", { name: "จัดซื้อโน้ตบุ๊ก" })).toHaveAttribute("href", routes.dashboards.tors.detail(11));
    expect(first.getByText("e-bidding")).toBeInTheDocument();
    expect(first.getByText("1,234,567.5")).toBeInTheDocument();
    expect(first.getByText("เริ่มรับซองในอีก 8 วัน")).toBeInTheDocument();
    expect(first.getByText("ประกาศแล้ว")).toBeInTheDocument();

    const second = within(items[1]);
    expect(second.getByRole("link", { name: "จัดซื้อโต๊ะ" })).toHaveAttribute("href", routes.dashboards.tors.detail(12));
    expect(second.getByText("5,000")).toBeInTheDocument();
    expect(second.getByText("ยังไม่กำหนด")).toBeInTheDocument();
    expect(second.getByText("ร่าง")).toBeInTheDocument();
  });

  it("shows every TOR it is given without filtering (visibility is applied by the backend)", () => {
    const cancelled = makeTor({ id: 13, torCode: "TOR-2026-003", title: "ยกเลิกแล้ว", status: "cancelled" });
    render(<TenderProjectTorList tors={[cancelled]} />);

    const row = within(screen.getByRole("table")).getAllByRole("row")[1];
    expect(within(row).getByRole("link", { name: "ยกเลิกแล้ว" })).toBeInTheDocument();
    expect(within(row).getByText("ยกเลิก")).toBeInTheDocument();
  });
});
