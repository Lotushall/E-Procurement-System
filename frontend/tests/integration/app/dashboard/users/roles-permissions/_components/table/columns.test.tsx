import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { columns } from "@/app/dashboard/users/roles-permissions/_components/table/columns";
import type { RoleDetail } from "@/lib/user/management/types";
import { makePermission, makeRole } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

function RoleTable({ roles }: { roles: RoleDetail[] }) {
  // eslint-disable-next-line react-hooks/incompatible-library -- test harness; memoization is irrelevant here
  const table = useReactTable({ data: roles, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderTable(roles: RoleDetail[]) {
  server.use(http.get(apiUrl("/api/v1/dashboard/permissions"), () => HttpResponse.json({ data: [makePermission()] })));
  return renderWithQueryClient(<RoleTable roles={roles} />);
}

const bodyRows = () => screen.getAllByRole("row").slice(1);

describe("roles table columns", () => {
  it("defines the name, permissions, userCount and actions columns in that order", () => {
    expect(columns.map((column) => column.id)).toEqual(["name", "permissions", "userCount", "actions"]);
  });

  it("renders the Thai and English headers", () => {
    renderTable([]);

    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "ชื่อ Role",
      "Permission",
      "จำนวนผู้ใช้",
      "Actions",
    ]);
  });

  it("renders the role name, permission count and user count", () => {
    renderTable([makeRole({ id: 4, name: "procurement_officer", permissions: ["a.b", "c.d"], userCount: 5 })]);

    const row = bodyRows()[0];
    expect(within(row).getByText("procurement_officer")).toBeInTheDocument();
    expect(within(row).getByText("2 permissions")).toBeInTheDocument();
    expect(within(row).getByText("5 คน")).toBeInTheDocument();
  });

  it("counts zero permissions for an empty list", () => {
    renderTable([makeRole({ permissions: [] })]);

    expect(within(bodyRows()[0]).getByText("0 permissions")).toBeInTheDocument();
  });

  it("counts zero permissions when the API omits the list", () => {
    renderTable([makeRole({ permissions: undefined as unknown as string[] })]);

    expect(within(bodyRows()[0]).getByText("0 permissions")).toBeInTheDocument();
  });

  it("renders edit and delete actions for each row", () => {
    renderTable([makeRole({ id: 1, name: "admin", userCount: 2 }), makeRole({ id: 2, name: "officer", userCount: 0 })]);

    const [first, second] = bodyRows();
    expect(within(first).getByRole("button", { name: "แก้ไข role" })).toBeEnabled();
    expect(within(first).getByRole("button", { name: "ลบ role" })).toBeDisabled();
    expect(within(second).getByRole("button", { name: "แก้ไข role" })).toBeEnabled();
    expect(within(second).getByRole("button", { name: "ลบ role" })).toBeEnabled();
  });

  it("cannot hide the actions column", () => {
    expect(columns.find((column) => column.id === "actions")?.enableHiding).toBe(false);
  });
});
