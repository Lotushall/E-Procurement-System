import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import RolesPermissionsPage from "@/app/dashboard/users/roles-permissions/page";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { routes } from "@/lib/routes";
import type { Permission, RoleDetail } from "@/lib/user/management/types";
import { makePermission, makeRole } from "@/tests/fixtures/user-management";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const ROLES_URL = apiUrl("/api/v1/dashboard/roles");
const PERMISSIONS_URL = apiUrl("/api/v1/dashboard/permissions");
const FORBIDDEN = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้";
const HEADING = "จัดการ Role และ Permission";

const PERMISSIONS: Permission[] = [
  makePermission({ name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users" }),
  makePermission({ name: "vendors.approve", label: "อนุมัติผู้ค้า", group: "vendors" }),
];

function serveLists(roles: RoleDetail[] = [], permissions: Permission[] = PERMISSIONS) {
  const calls = { roles: 0, permissions: 0 };
  server.use(
    http.get(ROLES_URL, () => {
      calls.roles += 1;
      return HttpResponse.json({ data: roles });
    }),
    http.get(PERMISSIONS_URL, () => {
      calls.permissions += 1;
      return HttpResponse.json({ data: permissions });
    }),
  );
  return calls;
}

function renderPage() {
  const rendered = renderWithQueryClient(<RolesPermissionsPage />);
  return { ...rendered, user: userEvent.setup() };
}

const roleTab = () => screen.getByRole("tab", { name: "Role" });
const permissionTab = () => screen.getByRole("tab", { name: "Permission" });

describe("RolesPermissionsPage — admin gate", () => {
  it("shows a spinner and nothing else while the user is loading", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise(() => {})));
    const calls = serveLists();

    renderPage();

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    expect(screen.queryByText(FORBIDDEN)).not.toBeInTheDocument();
    expect(calls).toEqual({ roles: 0, permissions: 0 });
  });

  it("blocks a signed-in user who is not an admin, even with user permissions, and makes no list request", async () => {
    signInAs({ roles: ["officer"], permissions: ["users.viewAny", "users.create"] });
    const calls = serveLists();

    renderPage();

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "สร้าง role" })).not.toBeInTheDocument();
    expect(calls).toEqual({ roles: 0, permissions: 0 });
  });

  it("blocks a user with no roles", async () => {
    signInAs({ roles: [], permissions: [] });
    const calls = serveLists();

    renderPage();

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(calls).toEqual({ roles: 0, permissions: 0 });
  });

  it("blocks a signed-out visitor", async () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new HttpResponse(null, { status: 401 })));
    const calls = serveLists();

    renderPage();

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(calls).toEqual({ roles: 0, permissions: 0 });
  });

  it("shows the page to an admin", async () => {
    signInAs({ roles: ["admin"] });
    serveLists([makeRole({ id: 1, name: "officer", permissions: ["users.viewAny"], userCount: 2 })]);

    renderPage();

    expect(await screen.findByRole("heading", { name: HEADING })).toBeInTheDocument();
    expect(screen.getByText("กำหนด role, permission และความสัมพันธ์ระหว่างกันสำหรับพนักงานภายใน")).toBeInTheDocument();
    expect(screen.queryByText(FORBIDDEN)).not.toBeInTheDocument();
    expect(await screen.findByText("officer")).toBeInTheDocument();
  });
});

describe("RolesPermissionsPage — breadcrumb", () => {
  it("links back to user management", async () => {
    signInAs({ roles: ["admin"] });
    serveLists();

    renderPage();
    await screen.findByRole("heading", { name: HEADING });

    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการผู้ใช้", href: routes.dashboards.user.index },
      { label: HEADING },
    ]);
  });
});

describe("RolesPermissionsPage — tabs", () => {
  const ROLES = [makeRole({ id: 1, name: "officer", permissions: ["users.viewAny"], userCount: 2 })];

  async function renderAdmin(roles: RoleDetail[] = ROLES, permissions: Permission[] = PERMISSIONS) {
    signInAs({ roles: ["admin"] });
    const calls = serveLists(roles, permissions);
    const rendered = renderPage();
    await screen.findByRole("heading", { name: HEADING });
    return { ...rendered, calls };
  }

  it("starts on the role tab with its table and create-role button", async () => {
    await renderAdmin();

    expect(roleTab()).toHaveAttribute("aria-selected", "true");
    expect(permissionTab()).toHaveAttribute("aria-selected", "false");
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByText("officer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "สร้าง role" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "สร้าง permission" })).not.toBeInTheDocument();
    expect(screen.queryByText("จัดการผู้ใช้")).not.toBeInTheDocument();
  });

  it("switches to permissions: the grouped list and create-permission button replace the role ones", async () => {
    const { user } = await renderAdmin();
    await screen.findByText("officer");

    await user.click(permissionTab());

    expect(await screen.findByText("จัดการผู้ใช้")).toBeInTheDocument();
    expect(screen.getByText("ดูรายการผู้ใช้")).toBeInTheDocument();
    expect(permissionTab()).toHaveAttribute("aria-selected", "true");
    expect(roleTab()).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("button", { name: "สร้าง permission" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "สร้าง role" })).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("officer")).not.toBeInTheDocument();
  });

  it("switches back to roles", async () => {
    const { user } = await renderAdmin();
    await user.click(permissionTab());
    await screen.findByText("ดูรายการผู้ใช้");

    await user.click(roleTab());

    expect(await screen.findByText("officer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "สร้าง role" })).toBeInTheDocument();
    expect(screen.queryByText("ดูรายการผู้ใช้")).not.toBeInTheDocument();
  });

  it("switches tabs from the keyboard", async () => {
    const { user } = await renderAdmin();
    await screen.findByText("officer");

    roleTab().focus();
    await user.keyboard("{ArrowRight}{Enter}");

    expect(await screen.findByText("ดูรายการผู้ใช้")).toBeInTheDocument();
    expect(permissionTab()).toHaveAttribute("aria-selected", "true");
  });

  it("reaches each tab's empty state independently", async () => {
    const { user } = await renderAdmin([], []);
    expect(await screen.findByText("ยังไม่มี role ในระบบ")).toBeInTheDocument();

    await user.click(permissionTab());

    expect(await screen.findByText("ยังไม่มี permission ในระบบ")).toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มี role ในระบบ")).not.toBeInTheDocument();
  });

  it("shows the error text only on the tab whose list failed", async () => {
    signInAs({ roles: ["admin"] });
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json({ data: ROLES })),
      http.get(PERMISSIONS_URL, () => new HttpResponse(null, { status: 500 })),
    );
    const { user } = renderPage();
    expect(await screen.findByText("officer")).toBeInTheDocument();

    await user.click(permissionTab());

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูล permission ได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.queryByText("ไม่สามารถโหลดข้อมูล role ได้ กรุณาลองใหม่อีกครั้ง")).not.toBeInTheDocument();
  });
});

describe("RolesPermissionsPage — end to end wiring", () => {
  it("creates a role from the header button, ticks a permission and lists the new role", async () => {
    signInAs({ roles: ["admin"] });
    const roles: RoleDetail[] = [makeRole({ id: 1, name: "officer", permissions: ["users.viewAny"] })];
    const bodies: unknown[] = [];
    server.use(
      http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: PERMISSIONS })),
      http.get(ROLES_URL, () => HttpResponse.json({ data: roles })),
      http.post(ROLES_URL, async ({ request }) => {
        const body = (await request.json()) as { name: string; permissions: string[] };
        bodies.push(body);
        const created = makeRole({ id: 2, name: body.name, permissions: body.permissions });
        roles.push(created);
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );
    const { user } = renderPage();
    await screen.findByText("officer");

    await user.click(screen.getByRole("button", { name: "สร้าง role" }));
    const dialog = await screen.findByRole("dialog", { name: "สร้าง role" });
    await user.type(await within(dialog).findByPlaceholderText("เช่น procurement_officer"), "auditor");
    await user.click(within(dialog).getByRole("checkbox", { name: /vendors\.approve/ }));
    await user.click(within(dialog).getByRole("button", { name: "สร้าง role" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้าง role สำเร็จ"));
    expect(bodies).toEqual([{ name: "auditor", permissions: ["vendors.approve"] }]);
    expect(await screen.findByText("auditor")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("creates a permission from the header button on the permission tab and lists it", async () => {
    signInAs({ roles: ["admin"] });
    const permissions: Permission[] = [...PERMISSIONS];
    const bodies: unknown[] = [];
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json({ data: [] })),
      http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: permissions })),
      http.post(PERMISSIONS_URL, async ({ request }) => {
        const body = (await request.json()) as { name: string; label: string };
        bodies.push(body);
        const created = makePermission({ ...body, group: "reports" });
        permissions.push(created);
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );
    const { user } = renderPage();
    await user.click(await screen.findByRole("tab", { name: "Permission" }));
    await screen.findByText("ดูรายการผู้ใช้");

    await user.click(screen.getByRole("button", { name: "สร้าง permission" }));
    const dialog = await screen.findByRole("dialog", { name: "สร้าง permission" });
    await user.type(within(dialog).getByPlaceholderText("เช่น reports.export"), "reports.export");
    await user.type(within(dialog).getByPlaceholderText("เช่น ส่งออกรายงาน"), "ส่งออกรายงาน");
    await user.click(within(dialog).getByRole("button", { name: "สร้าง permission" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้าง permission สำเร็จ"));
    expect(bodies).toEqual([{ name: "reports.export", label: "ส่งออกรายงาน" }]);
    expect(await screen.findByText("reports.export")).toBeInTheDocument();
    expect(screen.getByText("ส่งออกรายงาน")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
