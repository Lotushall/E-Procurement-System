import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { RoleTab } from "@/app/dashboard/users/roles-permissions/_components/role-tab";
import type { RoleDetail } from "@/lib/user/management/types";
import { makePermission, makeRole } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const ROLES_URL = apiUrl("/api/v1/dashboard/roles");
const PERMISSIONS_URL = apiUrl("/api/v1/dashboard/permissions");

function serveRoles(roles: RoleDetail[]) {
  let calls = 0;
  server.use(
    http.get(ROLES_URL, () => {
      calls += 1;
      return HttpResponse.json({ data: roles });
    }),
    http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: [makePermission()] })),
  );
  return () => calls;
}

const dataRows = () => screen.getAllByRole("row").slice(1);

describe("RoleTab — loading", () => {
  it("shows only a spinner while the list is pending", () => {
    server.use(http.get(ROLES_URL, () => new Promise(() => {})));

    renderWithQueryClient(<RoleTab />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มี role ในระบบ")).not.toBeInTheDocument();
  });
});

describe("RoleTab — error", () => {
  it.each([500, 404])("replaces the spinner with the load-error text on a %s", async (status) => {
    server.use(http.get(ROLES_URL, () => new HttpResponse(null, { status })));

    renderWithQueryClient(<RoleTab />);

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูล role ได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มี role ในระบบ")).not.toBeInTheDocument();
  });
});

describe("RoleTab — empty", () => {
  it("shows the empty row under the headers when there are no roles", async () => {
    serveRoles([]);

    renderWithQueryClient(<RoleTab />);

    expect(await screen.findByText("ยังไม่มี role ในระบบ")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ชื่อ Role" })).toBeInTheDocument();
    expect(dataRows()).toHaveLength(1);
    expect(screen.getByText("ยังไม่มี role ในระบบ").closest("td")).toHaveAttribute("colspan", "4");
  });
});

describe("RoleTab — populated", () => {
  const ROLES = [
    makeRole({ id: 1, name: "admin", permissions: ["users.viewAny", "users.create", "vendors.approve"], userCount: 1 }),
    makeRole({ id: 2, name: "officer", permissions: ["users.viewAny"], userCount: 0 }),
  ];

  it("renders one row per role with name, permission count and user count", async () => {
    serveRoles(ROLES);

    renderWithQueryClient(<RoleTab />);

    await screen.findByText("admin");
    const rows = dataRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("admin")).toBeInTheDocument();
    expect(within(rows[0]).getByText("3 permissions")).toBeInTheDocument();
    expect(within(rows[0]).getByText("1 คน")).toBeInTheDocument();
    expect(within(rows[1]).getByText("officer")).toBeInTheDocument();
    expect(within(rows[1]).getByText("1 permissions")).toBeInTheDocument();
    expect(within(rows[1]).getByText("0 คน")).toBeInTheDocument();
  });

  it("gives each row its own edit and delete buttons, with delete disabled only for a role in use", async () => {
    serveRoles(ROLES);

    renderWithQueryClient(<RoleTab />);

    await screen.findByText("admin");
    const rows = dataRows();
    for (const row of rows) {
      expect(within(row).getByRole("button", { name: "แก้ไข role" })).toBeEnabled();
    }
    expect(within(rows[0]).getByRole("button", { name: "ลบ role" })).toBeDisabled();
    expect(within(rows[1]).getByRole("button", { name: "ลบ role" })).toBeEnabled();
  });

  it("requests the roles list once", async () => {
    const calls = serveRoles(ROLES);

    renderWithQueryClient(<RoleTab />);

    await screen.findByText("admin");
    expect(calls()).toBe(1);
  });
});
