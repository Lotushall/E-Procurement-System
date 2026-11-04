import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SortingState } from "@tanstack/react-table";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { createColumns } from "@/app/dashboard/tender-projects/_components/table/columns";
import { DataTable } from "@/components/ui/data-table";
import type { TenderProjects } from "@/lib/tender/tender-projects/types";
import { makeDepartment, makeInternalProfile } from "@/tests/fixtures/internal-profiles";
import { makeTenderProject } from "@/tests/fixtures/tender-projects";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

function renderTable(
  data: TenderProjects[],
  {
    canUpdateStatus = false,
    canUpdate = true,
    canDelete = true,
    isAdmin = false,
    sorting = [] as SortingState,
    onSortingChange = vi.fn(),
  } = {},
) {
  // แต่ละแถวมี EditTenderProjectDialog ที่ดึงตัวเลือกแผนกตั้งแต่ mount
  server.use(http.get(apiUrl("/api/v1/dashboard/departments/select"), () => HttpResponse.json({ data: [makeDepartment()] })));
  renderWithQueryClient(
    <DataTable
      columns={createColumns(canUpdateStatus, canUpdate, canDelete, isAdmin)}
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
// ลำดับ cell: รหัส, โครงการ/หน่วยงาน, ผู้รับผิดชอบ, งบประมาณ, ยอดจัดสรร, ระยะเวลา, TOR, สถานะ, Actions
const cell = (row: HTMLElement, index: number) => within(row).getAllByRole("cell")[index];

describe("createColumns — header", () => {
  it("renders the nine column headers", () => {
    renderTable([makeTenderProject()]);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "รหัสโครงการ",
      "โครงการ / หน่วยงาน",
      "ผู้รับผิดชอบ",
      "งบประมาณ",
      "ยอดจัดสรร",
      "ระยะเวลา",
      "TOR",
      "สถานะ",
      "Actions",
    ]);
  });

  it.each([
    ["รหัสโครงการ", "project_code"],
    ["โครงการ / หน่วยงาน", "name"],
    ["งบประมาณ", "budget"],
  ])("sorts by %s through the %s column id", async (label, id) => {
    const { user, onSortingChange } = renderTable([makeTenderProject()]);

    await user.click(within(screen.getByRole("columnheader", { name: label })).getByRole("button"));

    expect(onSortingChange).toHaveBeenCalledOnce();
    const updater = onSortingChange.mock.calls[0][0];
    expect(typeof updater === "function" ? updater([]) : updater).toEqual([{ id, desc: false }]);
  });

  it.each(["ผู้รับผิดชอบ", "ยอดจัดสรร", "ระยะเวลา", "TOR", "สถานะ", "Actions"])(
    "is not sortable by %s",
    (label) => {
      renderTable([makeTenderProject()]);

      expect(within(screen.getByRole("columnheader", { name: label })).queryByRole("button")).not.toBeInTheDocument();
    },
  );
});

describe("createColumns — code and name cells", () => {
  it("links the code and the name to the detail page", () => {
    renderTable([makeTenderProject({ id: 42, projectCode: "TP-2569-042", name: "จัดซื้อโต๊ะ" })]);

    const row = dataRow();
    expect(within(cell(row, 0)).getByRole("link", { name: "TP-2569-042" })).toHaveAttribute(
      "href",
      "/dashboard/tender-projects/detail?id=42",
    );
    const nameLink = within(cell(row, 1)).getByRole("link");
    expect(nameLink).toHaveAttribute("href", "/dashboard/tender-projects/detail?id=42");
    expect(nameLink).toHaveTextContent("จัดซื้อโต๊ะ");
  });

  it("shows the department name under the project name", () => {
    renderTable([makeTenderProject({ department: { id: 3, name: "บัญชี" } })]);

    expect(within(cell(dataRow(), 1)).getByRole("link")).toHaveTextContent("บัญชี");
  });

  it("shows a dash when the department was not loaded", () => {
    renderTable([makeTenderProject({ name: "โครงการ ก", department: undefined })]);

    expect(within(cell(dataRow(), 1)).getByRole("link")).toHaveTextContent("โครงการ ก-");
  });
});

describe("createColumns — person in charge", () => {
  it("shows the first and last name", () => {
    renderTable([makeTenderProject({ personInCharge: makeInternalProfile({ firstname: "สมหญิง", lastname: "รักดี" }) })]);

    expect(cell(dataRow(), 2)).toHaveTextContent("สมหญิง รักดี");
  });

  it.each([
    ["is missing", undefined],
    ["is null", null],
  ])("shows a dash when the person %s", (_name, personInCharge) => {
    renderTable([makeTenderProject({ personInCharge })]);

    expect(cell(dataRow(), 2)).toHaveTextContent(/^-$/);
  });

  it("shows a dash when the last name is empty", () => {
    renderTable([makeTenderProject({ personInCharge: makeInternalProfile({ firstname: "สมหญิง", lastname: "" }) })]);

    expect(cell(dataRow(), 2)).toHaveTextContent(/^-$/);
  });
});

describe("createColumns — budget and allocation", () => {
  it("shows the fiscal year above the grouped budget", () => {
    renderTable([makeTenderProject({ fiscalYear: 2570, budget: "1250000.00" })]);

    const budget = cell(dataRow(), 3);
    expect(budget).toHaveTextContent("ปีงบประมาณ 2570");
    // แสดง ฿ เหมือนการ์ด
    expect(budget).toHaveTextContent("฿1,250,000");
  });

  it("keeps the satang of the budget", () => {
    renderTable([makeTenderProject({ budget: "500000.55" })]);

    expect(cell(dataRow(), 3)).toHaveTextContent("฿500,000.55");
  });

  it("shows how much of the budget is allocated and what is left", () => {
    renderTable([makeTenderProject({ budget: "1000000.00", allocatedBudget: "250000.00" })]);

    const allocation = cell(dataRow(), 4);
    expect(within(allocation).getByRole("img", { name: "จัดสรร 25% ของงบประมาณ" })).toBeInTheDocument();
    expect(allocation).toHaveTextContent("เหลือ ฿750,000");
  });

  it("warns when the allocation exceeds the budget", () => {
    renderTable([makeTenderProject({ budget: "1000000.00", allocatedBudget: "1200000.00" })]);

    const allocation = cell(dataRow(), 4);
    expect(allocation).toHaveTextContent("จัดสรรเกินงบ 120%");
    expect(allocation).toHaveTextContent("เกิน ฿200,000");
  });

  it("says nothing is allocated yet", () => {
    renderTable([makeTenderProject({ allocatedBudget: "0.00" })]);

    expect(cell(dataRow(), 4)).toHaveTextContent("ยังไม่ได้จัดสรร");
  });
});

describe("createColumns — period", () => {
  it("shows start and end", () => {
    renderTable([
      makeTenderProject({ projectStartAt: "2026-01-05T00:00:00.000000Z", projectEndAt: "2026-12-31T00:00:00.000000Z" }),
    ]);

    // คำถามค้างให้คนตัดสิน: ปีในคอลัมน์ระยะเวลาเป็น ค.ศ. (2026) แต่ปีงบประมาณเป็น พ.ศ. (2569) — ต้องการแบบไหน
    expect(cell(dataRow(), 5)).toHaveTextContent("5 ม.ค. 2026 - 31 ธ.ค. 2026");
  });

  it("shows only the start when there is no end", () => {
    renderTable([makeTenderProject({ projectStartAt: "2026-01-05T00:00:00.000000Z", projectEndAt: undefined })]);

    expect(cell(dataRow(), 5)).toHaveTextContent(/^5 ม\.ค\. 2026$/);
  });

  it("shows only the end when there is no start", () => {
    renderTable([makeTenderProject({ projectStartAt: undefined, projectEndAt: "2026-12-31T00:00:00.000000Z" })]);

    expect(cell(dataRow(), 5)).toHaveTextContent(/^31 ธ\.ค\. 2026$/);
  });

  it("shows a dash when neither date is set", () => {
    renderTable([makeTenderProject({ projectStartAt: undefined, projectEndAt: undefined })]);

    expect(cell(dataRow(), 5)).toHaveTextContent(/^-$/);
  });
});

describe("createColumns — TOR count", () => {
  it("shows the number of TORs", () => {
    renderTable([makeTenderProject({ torsCount: 7 })]);

    expect(cell(dataRow(), 6)).toHaveTextContent(/^7$/);
  });

  it("shows zero as 0", () => {
    renderTable([makeTenderProject({ torsCount: 0 })]);

    expect(cell(dataRow(), 6)).toHaveTextContent(/^0$/);
  });

  it("shows a dash when the count was not sent", () => {
    renderTable([makeTenderProject({ torsCount: undefined })]);

    expect(cell(dataRow(), 6)).toHaveTextContent(/^-$/);
  });
});

describe("createColumns — status", () => {
  it("shows a read-only badge without the update-status permission", () => {
    renderTable([makeTenderProject({ status: "published" })], { canUpdateStatus: false });

    const status = cell(dataRow(), 7);
    expect(status).toHaveTextContent("กำลังดำเนินการ");
    expect(within(status).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows the status select with the update-status permission", () => {
    renderTable([makeTenderProject({ status: "published" })], { canUpdateStatus: true });

    expect(within(cell(dataRow(), 7)).getByRole("combobox")).toHaveTextContent("กำลังดำเนินการ");
  });

  it("changes the status of the right row", async () => {
    // status select อ่าน role ของผู้ใช้ — published → closed เป็นขั้นถัดไปที่ทำได้แม้ไม่ใช่ admin
    signInAs({ roles: ["officer"] });
    const patched: unknown[] = [];
    server.use(
      http.patch(apiUrl("/api/v1/dashboard/tender-projects/:id/status"), async ({ params, request }) => {
        patched.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ data: makeTenderProject({ id: 2, status: "closed" }) });
      }),
    );
    const { user } = renderTable(
      [makeTenderProject({ id: 1, status: "draft" }), makeTenderProject({ id: 2, status: "published" })],
      { canUpdateStatus: true },
    );

    await user.click(within(cell(dataRow(1), 7)).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "ปิดรับซอง" }));

    await waitFor(() => expect(patched).toEqual([{ id: "2", body: { status: "closed" } }]));
  });
});

describe("createColumns — actions", () => {
  it("offers edit and delete buttons that open their dialogs for the row", async () => {
    const { user } = renderTable([makeTenderProject({ id: 3, name: "จัดซื้อเก้าอี้" })]);
    const actions = cell(dataRow(), 8);

    await user.click(within(actions).getByRole("button", { name: "ลบโครงการ" }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent('ต้องการลบโครงการ "จัดซื้อเก้าอี้" ใช่หรือไม่?');
  });

  it("opens the edit dialog seeded with the row's values", async () => {
    // dialog โหลดรายชื่อผู้รับผิดชอบเมื่อเปิด
    server.use(http.get(apiUrl("/api/v1/dashboard/internal-profiles/select"), () => HttpResponse.json({ data: [] })));
    const { user } = renderTable([makeTenderProject({ name: "จัดซื้อเก้าอี้" })]);

    await user.click(within(cell(dataRow(), 8)).getByRole("button", { name: "แก้ไขโครงการ" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("แก้ไขโครงการจัดซื้อจัดจ้าง")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("จัดซื้อเก้าอี้")).toBeInTheDocument();
  });
});

describe("createColumns — action permissions", () => {
  it("hides the edit button when the user cannot update", () => {
    renderTable([makeTenderProject()], { canUpdate: false });

    const actions = cell(dataRow(), 8);
    expect(within(actions).queryByRole("button", { name: "แก้ไขโครงการ" })).not.toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "ลบโครงการ" })).toBeInTheDocument();
  });

  it("hides the delete button when the user cannot delete", () => {
    renderTable([makeTenderProject()], { canDelete: false });

    const actions = cell(dataRow(), 8);
    expect(within(actions).queryByRole("button", { name: "ลบโครงการ" })).not.toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "แก้ไขโครงการ" })).toBeInTheDocument();
  });

  it.each(["completed", "cancelled", "archived"] as const)(
    "hides edit and delete on a %s project from a non-admin",
    (status) => {
      renderTable([makeTenderProject({ status })]);

      const actions = cell(dataRow(), 8);
      expect(within(actions).queryByRole("button", { name: "แก้ไขโครงการ" })).not.toBeInTheDocument();
      expect(within(actions).queryByRole("button", { name: "ลบโครงการ" })).not.toBeInTheDocument();
    },
  );

  it("still offers edit and delete on a finished project to an admin", () => {
    renderTable([makeTenderProject({ status: "completed" })], { isAdmin: true });

    const actions = cell(dataRow(), 8);
    expect(within(actions).getByRole("button", { name: "แก้ไขโครงการ" })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "ลบโครงการ" })).toBeInTheDocument();
  });

  it("locks only the finished row and leaves the others editable", () => {
    renderTable([makeTenderProject({ id: 1, status: "draft" }), makeTenderProject({ id: 2, status: "archived" })]);

    expect(within(cell(dataRow(0), 8)).getByRole("button", { name: "แก้ไขโครงการ" })).toBeInTheDocument();
    expect(within(cell(dataRow(1), 8)).queryByRole("button", { name: "แก้ไขโครงการ" })).not.toBeInTheDocument();
  });
});

describe("createColumns — several rows", () => {
  it("renders one row per project in order", () => {
    renderTable([
      makeTenderProject({ id: 1, projectCode: "TP-2569-001" }),
      makeTenderProject({ id: 2, projectCode: "TP-2569-002" }),
    ]);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(within(cell(dataRow(0), 0)).getByRole("link")).toHaveTextContent("TP-2569-001");
    expect(within(cell(dataRow(1), 0)).getByRole("link")).toHaveTextContent("TP-2569-002");
  });
});
