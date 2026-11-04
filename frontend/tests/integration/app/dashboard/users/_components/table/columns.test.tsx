import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SortingState } from "@tanstack/react-table";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { createColumns, USER_TYPE_ICON, USER_TYPE_LABEL } from "@/app/dashboard/users/_components/table/columns";
import { DataTable } from "@/components/ui/data-table";
import type { UserListItem } from "@/lib/user/management/types";
import { makeManagedUser } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

interface Perms {
  status?: boolean;
  update?: boolean;
  delete?: boolean;
  currentUserId?: number;
}

function renderTable(data: UserListItem[], perms: Perms = {}, onSortingChange = vi.fn(), sorting: SortingState = []) {
  const columns = createColumns(perms.status ?? false, perms.update ?? false, perms.delete ?? false, perms.currentUserId);
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
// ลำดับ cell: ผู้ใช้, ประเภท, อีเมล, สถานะ, วันที่สร้าง, Actions
const cell = (row: HTMLElement, index: number) => within(row).getAllByRole("cell")[index];

describe("USER_TYPE_LABEL / USER_TYPE_ICON", () => {
  it("labels every user type in Thai", () => {
    expect(USER_TYPE_LABEL).toEqual({ internal: "พนักงานภายใน", company: "นิติบุคคล", individual: "ร้านค้า" });
  });

  it("has a distinct icon per user type", () => {
    const icons = Object.values(USER_TYPE_ICON);
    expect(Object.keys(USER_TYPE_ICON)).toEqual(["internal", "company", "individual"]);
    expect(new Set(icons).size).toBe(3);
  });
});

describe("columns — header", () => {
  it("renders the six column headers", () => {
    renderTable([makeManagedUser()]);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "ผู้ใช้",
      "ประเภท",
      "อีเมล",
      "สถานะ",
      "วันที่สร้าง",
      "Actions",
    ]);
  });

  it.each([
    ["ผู้ใช้", "username"],
    ["อีเมล", "email"],
    ["วันที่สร้าง", "created_at"],
  ])("sorts by %s through the %s column id", async (label, id) => {
    const { user, onSortingChange } = renderTable([makeManagedUser()]);

    await user.click(within(screen.getAllByRole("columnheader").find((h) => h.textContent === label)!).getByRole("button"));

    expect(onSortingChange).toHaveBeenCalledOnce();
    const updater = onSortingChange.mock.calls[0][0];
    expect(typeof updater === "function" ? updater([]) : updater).toEqual([{ id, desc: false }]);
  });

  it.each(["ประเภท", "สถานะ", "Actions"])("is not sortable by %s", (label) => {
    renderTable([makeManagedUser()]);

    const header = screen.getAllByRole("columnheader").find((h) => h.textContent === label)!;
    expect(within(header).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("columns — cells", () => {
  it("shows username, display name, type, email, status and created date for a row", () => {
    renderTable([
      makeManagedUser({
        username: "acme",
        name: "บริษัท เอซีเอ็มอี จำกัด",
        userType: "company",
        email: "contact@acme.example",
        status: "pending",
        createdAt: "2026-03-09T20:30:00.000000Z",
      }),
    ]);

    const row = dataRow();
    expect(cell(row, 0)).toHaveTextContent("acme");
    expect(cell(row, 0)).toHaveTextContent("บริษัท เอซีเอ็มอี จำกัด");
    expect(cell(row, 1)).toHaveTextContent("นิติบุคคล");
    expect(cell(row, 2)).toHaveTextContent("contact@acme.example");
    expect(cell(row, 3)).toHaveTextContent("รอตรวจสอบ");
    // 2026-03-09T20:30Z = 10 มี.ค. 03:30 เวลาไทย
    expect(cell(row, 4)).toHaveTextContent("10-03-2026");
  });

  it.each([
    ["internal", "พนักงานภายใน"],
    ["company", "นิติบุคคล"],
    ["individual", "ร้านค้า"],
  ] as const)("labels a %s user as %s", (userType, label) => {
    renderTable([makeManagedUser({ userType })]);

    expect(cell(dataRow(), 1)).toHaveTextContent(label);
  });

  it("links the user cell to the detail page and shows the initials", () => {
    renderTable([makeManagedUser({ id: 33, username: "somchai" })]);

    const link = within(dataRow()).getByRole("link", { name: /somchai/ });
    expect(link).toHaveAttribute("href", "/dashboard/users/detail?id=33");
    expect(within(link).getByText("S")).toBeInTheDocument();
  });

  it("shows a dash when the created date cannot be parsed", () => {
    renderTable([makeManagedUser({ createdAt: "not-a-date" })]);

    expect(cell(dataRow(), 4)).toHaveTextContent("-");
  });

  it("renders one row per user", () => {
    renderTable([makeManagedUser({ id: 1, username: "one" }), makeManagedUser({ id: 2, username: "two" })]);

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(cell(dataRow(1), 0)).toHaveTextContent("two");
  });
});

describe("columns — status cell", () => {
  it("shows a read-only badge without the status permission", () => {
    renderTable([makeManagedUser({ status: "active" })], { status: false });

    expect(within(dataRow()).queryByRole("combobox")).not.toBeInTheDocument();
    expect(cell(dataRow(), 3)).toHaveTextContent("ใช้งานอยู่");
  });

  it("shows an editable select with the status permission", () => {
    renderTable([makeManagedUser({ status: "active" })], { status: true });

    expect(within(dataRow()).getByRole("combobox")).toHaveTextContent("ใช้งานอยู่");
  });

  it("changes that row's status through the select", async () => {
    const calls: { id: unknown; body: unknown }[] = [];
    server.use(
      http.patch(apiUrl("/api/v1/dashboard/users/:id/status"), async ({ params, request }) => {
        calls.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ data: { status: "inactive" } });
      }),
    );
    const { user } = renderTable([makeManagedUser({ id: 1 }), makeManagedUser({ id: 2, status: "active" })], { status: true });

    await user.click(within(dataRow(1)).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "ปิดใช้งาน" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เปลี่ยนสถานะสำเร็จ"));
    expect(calls).toEqual([{ id: "2", body: { status: "inactive" } }]);
  });
});

describe("columns — actions", () => {
  it("shows no action buttons without edit or delete permission", () => {
    renderTable([makeManagedUser()], { status: true });

    const actions = cell(dataRow(), 5);
    expect(within(actions).queryByRole("button")).not.toBeInTheDocument();
    expect(within(actions).queryByRole("link")).not.toBeInTheDocument();
  });

  it("offers only the edit link with the update permission", () => {
    renderTable([makeManagedUser({ id: 8 })], { update: true });

    expect(within(dataRow()).getByRole("button", { name: "แก้ไข user" })).toHaveAttribute("href", "/dashboard/users/edit?id=8");
    expect(within(dataRow()).queryByRole("button", { name: "ลบ user" })).not.toBeInTheDocument();
  });

  it("offers only the delete button with the delete permission", () => {
    renderTable([makeManagedUser()], { delete: true });

    expect(within(dataRow()).getByRole("button", { name: "ลบ user" })).toBeEnabled();
    expect(within(dataRow()).queryByRole("button", { name: "แก้ไข user" })).not.toBeInTheDocument();
  });

  it("opens the delete confirmation naming that row's user and deletes it", async () => {
    const ids: unknown[] = [];
    server.use(
      http.delete(apiUrl("/api/v1/dashboard/users/:id"), ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderTable([makeManagedUser({ id: 7, username: "first" }), makeManagedUser({ id: 8, username: "second" })], {
      delete: true,
      currentUserId: 1000,
    });

    await user.click(within(dataRow(1)).getByRole("button", { name: "ลบ user" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent('"second"');
    await user.click(within(dialog).getByRole("button", { name: "ลบผู้ใช้" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ใช้สำเร็จ"));
    expect(ids).toEqual(["8"]);
  });

  it("disables delete only for the signed-in user's own row", () => {
    renderTable([makeManagedUser({ id: 1000, username: "me" }), makeManagedUser({ id: 2, username: "other" })], {
      delete: true,
      currentUserId: 1000,
    });

    expect(within(dataRow(0)).getByRole("button", { name: "ลบ user" })).toBeDisabled();
    expect(within(dataRow(1)).getByRole("button", { name: "ลบ user" })).toBeEnabled();
  });
});
