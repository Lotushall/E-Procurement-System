import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SortingState } from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import { torColumns } from "@/app/dashboard/tors/_components/table/columns";
import { DataTable } from "@/components/ui/data-table";
import { routes } from "@/lib/routes";
import type { Tor } from "@/lib/tender/tor/types";
import { makeTor } from "@/tests/fixtures/tors";
import { freezeTimeAt } from "@/tests/helpers/time";

// ข้อความ "เหลือ N วัน" ของช่วงรับซองคำนวณจากเวลาปัจจุบัน
freezeTimeAt("2026-11-02T10:00:00+07:00");

function renderTable(data: Tor[], { sorting = [] as SortingState, onSortingChange = vi.fn() } = {}) {
  render(
    <DataTable
      columns={torColumns}
      data={data}
      pageCount={1}
      total={data.length}
      pagination={{ pageIndex: 0, pageSize: 20 }}
      onPaginationChange={vi.fn()}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />,
  );
  return { onSortingChange, user: userEvent.setup() };
}

const dataRow = (index = 0) => screen.getAllByRole("row")[index + 1];
// ลำดับ cell: รหัส, TOR/หน่วยงาน, โครงการ, วิธีจัดซื้อ, ราคากลาง, ช่วงรับซอง, สถานะ
const cell = (row: HTMLElement, index: number) => within(row).getAllByRole("cell")[index];

describe("torColumns — header", () => {
  it("renders the seven column headers", () => {
    renderTable([makeTor()]);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "รหัส TOR",
      "TOR / หน่วยงาน",
      "โครงการ",
      "วิธีจัดซื้อจัดจ้าง",
      "ราคากลาง",
      "ช่วงรับซอง",
      "สถานะ",
    ]);
  });

  it.each([
    ["รหัส TOR", "tor_code"],
    ["TOR / หน่วยงาน", "title"],
    ["ราคากลาง", "budget_estimate"],
    ["ช่วงรับซอง", "bidding_end_at"],
  ])("sorts by %s through the %s column id", async (label, id) => {
    const { user, onSortingChange } = renderTable([makeTor({ biddingEndAt: "2026-11-20T16:00:00+07:00" })]);

    await user.click(within(screen.getByRole("columnheader", { name: label })).getByRole("button"));

    expect(onSortingChange).toHaveBeenCalledOnce();
    const updater = onSortingChange.mock.calls[0][0];
    expect(typeof updater === "function" ? updater([]) : updater).toEqual([{ id, desc: false }]);
  });

  // accessorFn ของ bidding_end_at คืน null ได้ — ถ้าไม่ตั้ง sortDescFirst: false tanstack จะเดาว่าเริ่มที่ desc
  it("sorts ascending on the first click of ช่วงรับซอง even when the first row has no bidding end date", async () => {
    const { user, onSortingChange } = renderTable([makeTor({ biddingEndAt: null })]);

    await user.click(within(screen.getByRole("columnheader", { name: "ช่วงรับซอง" })).getByRole("button"));

    const updater = onSortingChange.mock.calls[0][0];
    expect(typeof updater === "function" ? updater([]) : updater).toEqual([{ id: "bidding_end_at", desc: false }]);
  });

  it.each(["โครงการ", "วิธีจัดซื้อจัดจ้าง", "สถานะ"])("is not sortable by %s", (label) => {
    renderTable([makeTor()]);

    expect(within(screen.getByRole("columnheader", { name: label })).queryByRole("button")).not.toBeInTheDocument();
  });

  it("flips an ascending sort to descending on the next click", async () => {
    const { user, onSortingChange } = renderTable([makeTor()], { sorting: [{ id: "tor_code", desc: false }] });

    await user.click(within(screen.getByRole("columnheader", { name: "รหัส TOR" })).getByRole("button"));

    const updater = onSortingChange.mock.calls[0][0];
    expect(typeof updater === "function" ? updater([{ id: "tor_code", desc: false }]) : updater).toEqual([
      { id: "tor_code", desc: true },
    ]);
  });
});

describe("torColumns — code and title cells", () => {
  it("links the code and the title to the TOR detail page", () => {
    renderTable([makeTor({ id: 42, torCode: "TOR-2569-042", title: "จัดซื้อโต๊ะ" })]);

    const row = dataRow();
    expect(within(cell(row, 0)).getByRole("link", { name: "TOR-2569-042" })).toHaveAttribute(
      "href",
      routes.dashboards.tors.detail(42),
    );
    const titleLink = within(cell(row, 1)).getByRole("link");
    expect(titleLink).toHaveAttribute("href", routes.dashboards.tors.detail(42));
    expect(titleLink).toHaveTextContent("จัดซื้อโต๊ะ");
  });

  it("shows the department name under the title", () => {
    renderTable([makeTor({ title: "จัดซื้อโต๊ะ", department: { id: 3, name: "บัญชี" } })]);

    expect(within(cell(dataRow(), 1)).getByRole("link")).toHaveTextContent("จัดซื้อโต๊ะบัญชี");
  });
});

describe("torColumns — tender project", () => {
  it("links the project name to the project detail page", () => {
    renderTable([makeTor({ tenderProject: { id: 7, projectCode: "TP-2569-007", name: "จัดซื้อคอมพิวเตอร์" } })]);

    const link = within(cell(dataRow(), 2)).getByRole("link", { name: "จัดซื้อคอมพิวเตอร์" });
    expect(link).toHaveAttribute("href", routes.dashboards.tender_project.detail(7));
    expect(link).toHaveAttribute("title", "จัดซื้อคอมพิวเตอร์");
  });

  it("shows a dash and no link for a TOR outside any project", () => {
    renderTable([makeTor({ tenderProject: null })]);

    const project = cell(dataRow(), 2);
    expect(project).toHaveTextContent(/^-$/);
    expect(within(project).queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("torColumns — procurement method", () => {
  it("shows the method as plain text", () => {
    renderTable([makeTor({ procurementMethod: "คัดเลือก" })]);

    expect(cell(dataRow(), 3)).toHaveTextContent(/^คัดเลือก$/);
  });
});

describe("torColumns — budget", () => {
  it("shows the fiscal year above the grouped budget", () => {
    renderTable([makeTor({ fiscalYear: 2570, budgetEstimate: "1250000.00" })]);

    const budget = cell(dataRow(), 4);
    expect(budget).toHaveTextContent("ปีงบประมาณ 2570");
    expect(budget).toHaveTextContent("1,250,000");
  });

  it("keeps the satang of the budget", () => {
    renderTable([makeTor({ budgetEstimate: "500000.55" })]);

    expect(cell(dataRow(), 4)).toHaveTextContent("500,000.55");
  });

  it("shows a zero budget as 0", () => {
    renderTable([makeTor({ budgetEstimate: "0.00" })]);

    expect(within(cell(dataRow(), 4)).getByText("0")).toBeInTheDocument();
  });
});

describe("torColumns — bidding window", () => {
  it("says the window is not set for a TOR without bidding dates", () => {
    renderTable([makeTor({ biddingStartAt: null, biddingEndAt: null })]);

    expect(cell(dataRow(), 5)).toHaveTextContent(/^ยังไม่กำหนด$/);
  });

  it("shows the range and the days left for a TOR that is open for bids", () => {
    renderTable([
      makeTor({
        status: "bidding",
        biddingStartAt: "2026-11-01T09:00:00+07:00",
        biddingEndAt: "2026-11-20T16:00:00+07:00",
      }),
    ]);

    const window = cell(dataRow(), 5);
    expect(window).toHaveTextContent("1 พ.ย. – 20 พ.ย. 26");
    expect(window).toHaveTextContent("เหลือ 18 วัน");
  });

  it("passes the TOR's status so a cancelled TOR shows no hint", () => {
    renderTable([
      makeTor({
        status: "cancelled",
        biddingStartAt: "2026-11-10T09:00:00+07:00",
        biddingEndAt: "2026-11-20T16:00:00+07:00",
      }),
    ]);

    const window = cell(dataRow(), 5);
    expect(window).toHaveTextContent(/^10 พ\.ย\. – 20 พ\.ย\. 26$/);
  });
});

describe("torColumns — status", () => {
  it.each([
    ["draft", "ร่าง"],
    ["in_review", "รอพิจารณา"],
    ["approved", "อนุมัติแล้ว"],
    ["bidding", "เปิดรับซอง"],
    ["cancelled", "ยกเลิก"],
  ] as const)("shows %s as the %s badge", (status, label) => {
    renderTable([makeTor({ status })]);

    expect(cell(dataRow(), 6)).toHaveTextContent(new RegExp(`^${label}$`));
  });
});

describe("torColumns — several rows", () => {
  it("renders one row per TOR in order", () => {
    renderTable([makeTor({ id: 1, torCode: "TOR-2569-001" }), makeTor({ id: 2, torCode: "TOR-2569-002" })]);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(within(cell(dataRow(0), 0)).getByRole("link")).toHaveTextContent("TOR-2569-001");
    expect(within(cell(dataRow(1), 0)).getByRole("link")).toHaveTextContent("TOR-2569-002");
  });
});
