import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SortingState } from "@tanstack/react-table";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { columns } from "@/app/dashboard/internal-employees/_components/table/columns";
import { DataTable } from "@/components/ui/data-table";
import type { InternalProfile } from "@/lib/internal-profiles/types";
import { makeDepartment, makeInternalProfile, makePosition } from "@/tests/fixtures/internal-profiles";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

function renderTable(data: InternalProfile[], onSortingChange = vi.fn(), sorting: SortingState = []) {
  signInAs({ id: 1000 });
  server.use(
    http.get(apiUrl("/api/v1/dashboard/departments/select"), () => HttpResponse.json({ data: [] })),
    http.get(apiUrl("/api/v1/dashboard/positions/select"), () => HttpResponse.json({ data: [] })),
  );
  renderWithQueryClient(
    <DataTable
      columns={columns}
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
// ลำดับ cell: รหัสพนักงาน, ชื่อ-นามสกุล, แผนก, ตำแหน่ง, เบอร์โทร, Actions
const cell = (row: HTMLElement, index: number) => within(row).getAllByRole("cell")[index];

describe("columns — header", () => {
  it("renders the six column headers", () => {
    renderTable([makeInternalProfile()]);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "รหัสพนักงาน",
      "ชื่อ-นามสกุล",
      "แผนก",
      "ตำแหน่ง",
      "เบอร์โทร",
      "Actions",
    ]);
  });

  it.each([
    ["รหัสพนักงาน", "employee_no"],
    ["ชื่อ-นามสกุล", "firstname"],
    ["แผนก", "department"],
    ["ตำแหน่ง", "position"],
  ])("sorts by %s through the %s column id", async (label, id) => {
    const { user, onSortingChange } = renderTable([makeInternalProfile()]);

    await user.click(within(screen.getAllByRole("columnheader").find((h) => h.textContent === label)!).getByRole("button"));

    expect(onSortingChange).toHaveBeenCalledOnce();
    const updater = onSortingChange.mock.calls[0][0];
    expect(typeof updater === "function" ? updater([]) : updater).toEqual([{ id, desc: false }]);
  });

  it("is not sortable by phone or actions", () => {
    renderTable([makeInternalProfile()]);

    const phoneHeader = screen.getByRole("columnheader", { name: "เบอร์โทร" });
    expect(within(phoneHeader).queryByRole("button")).not.toBeInTheDocument();
    expect(within(screen.getByRole("columnheader", { name: "Actions" })).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("columns — cells", () => {
  it("shows employee number, prefixed full name, department, position and phone", () => {
    renderTable([
      makeInternalProfile({
        employeeNo: "EMP-042",
        prefix: "นาง",
        firstname: "สมหญิง",
        lastname: "รักงาน",
        department: makeDepartment({ name: "บัญชี" }),
        position: makePosition({ name: "ผู้จัดการ" }),
        phone: "089-999-8888",
      }),
    ]);

    const row = dataRow();
    expect(cell(row, 0)).toHaveTextContent("EMP-042");
    expect(cell(row, 1)).toHaveTextContent("นางสมหญิง รักงาน");
    expect(cell(row, 2)).toHaveTextContent("บัญชี");
    expect(cell(row, 3)).toHaveTextContent("ผู้จัดการ");
    expect(cell(row, 4)).toHaveTextContent("089-999-8888");
  });

  it("shows a dash for a missing department, position and phone", () => {
    renderTable([makeInternalProfile({ department: null, position: null, phone: "" })]);

    const row = dataRow();
    expect(cell(row, 2)).toHaveTextContent("-");
    expect(cell(row, 3)).toHaveTextContent("-");
    expect(cell(row, 4)).toHaveTextContent("-");
  });

  it("renders one row per profile", () => {
    renderTable([
      makeInternalProfile({ id: 1, firstname: "หนึ่ง" }),
      makeInternalProfile({ id: 2, firstname: "สอง" }),
    ]);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(cell(dataRow(1), 1)).toHaveTextContent("สอง");
  });
});

describe("columns — actions", () => {
  it("links to the user detail page when the profile has an account", () => {
    renderTable([makeInternalProfile({ userId: 42 })]);

    // Button ที่ render เป็น <a> (nativeButton=false) ได้ role=button
    expect(within(dataRow()).getByRole("button", { name: "ดูข้อมูล user" })).toHaveAttribute(
      "href",
      "/dashboard/users/detail?id=42",
    );
  });

  it("has no user link when the profile has no account", () => {
    renderTable([makeInternalProfile({ userId: null })]);

    expect(within(dataRow()).queryByRole("button", { name: "ดูข้อมูล user" })).not.toBeInTheDocument();
  });

  it("offers edit and delete buttons for the row", () => {
    renderTable([makeInternalProfile()]);

    expect(within(dataRow()).getByRole("button", { name: "แก้ไขพนักงาน" })).toBeInTheDocument();
    expect(within(dataRow()).getByRole("button", { name: "ลบพนักงาน" })).toBeInTheDocument();
  });

  it("opens the edit dialog for that row's profile", async () => {
    const detail = vi.fn();
    server.use(
      http.get(apiUrl("/api/v1/dashboard/internal-profiles/:id"), ({ params }) => {
        detail(params.id);
        return HttpResponse.json({ data: makeInternalProfile({ id: 8, firstname: "แถวสอง" }) });
      }),
    );
    const { user } = renderTable([makeInternalProfile({ id: 7 }), makeInternalProfile({ id: 8, firstname: "แถวสอง" })]);

    await user.click(within(dataRow(1)).getByRole("button", { name: "แก้ไขพนักงาน" }));

    expect(await screen.findByRole("dialog", { name: "แก้ไขข้อมูลพนักงาน" })).toBeInTheDocument();
    expect(detail).toHaveBeenCalledExactlyOnceWith("8");
  });

  it("opens the delete confirmation naming that row's profile", async () => {
    const { user } = renderTable([
      makeInternalProfile({ id: 7, firstname: "แถวแรก" }),
      makeInternalProfile({ id: 8, firstname: "แถวสอง", lastname: "ตัวอย่าง" }),
    ]);

    await user.click(within(dataRow(1)).getByRole("button", { name: "ลบพนักงาน" }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent('"นายแถวสอง ตัวอย่าง"');
  });
});
