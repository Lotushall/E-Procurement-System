import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { PermissionsTab } from "@/app/dashboard/users/detail/_components/permissions-tab";
import type { Permission, RoleDetail, UserDetail } from "@/lib/user/management/types";
import { makePermission, makeRole, makeUserDetail } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const ROLES = [
  makeRole({ id: 1, name: "admin", permissions: ["users.viewAny", "users.create", "vendors.approve"] }),
  makeRole({ id: 2, name: "officer", permissions: ["users.viewAny"] }),
];
const PERMISSIONS = [
  makePermission({ name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users" }),
  makePermission({ name: "users.create", label: "สร้างผู้ใช้", group: "users" }),
  makePermission({ name: "vendors.approve", label: "อนุมัติผู้ค้า", group: "vendors" }),
];

function serveLookups(roles: RoleDetail[] = ROLES, permissions: Permission[] = PERMISSIONS) {
  server.use(
    http.get(apiUrl("/api/v1/dashboard/roles"), () => HttpResponse.json({ data: roles })),
    http.get(apiUrl("/api/v1/dashboard/permissions"), () => HttpResponse.json({ data: permissions })),
  );
}

async function renderTab(user: UserDetail) {
  const rendered = renderWithQueryClient(<PermissionsTab user={user} />);
  // รอ roles และ permissions โหลดเสร็จ — ก่อนหน้านั้นแสดงชื่อ permission เป็น label ชั่วคราว
  await waitFor(() => expect(rendered.queryClient.isFetching()).toBe(0));
  return rendered;
}

// การ์ดของแต่ละสิทธิ์ = div ที่ล้อมชื่อ permission (ข้อความ mono)
function item(name: string): HTMLElement {
  return screen.getAllByText(name)[0].closest("div.rounded-md") as HTMLElement;
}

describe("PermissionsTab — role", () => {
  it("shows the role badge", async () => {
    serveLookups();
    await renderTab(makeUserDetail({ role: "officer", permissions: [] }));

    expect(await screen.findByText("officer")).toBeInTheDocument();
    expect(screen.queryByText("ยังไม่ได้กำหนด role")).not.toBeInTheDocument();
  });

  it("shows a note when no role is assigned", async () => {
    serveLookups();
    await renderTab(makeUserDetail({ role: null, permissions: [] }));

    expect(await screen.findByText("ยังไม่ได้กำหนด role")).toBeInTheDocument();
  });
});

describe("PermissionsTab — permissions", () => {
  it("shows the empty note when the user has no permissions", async () => {
    serveLookups();
    await renderTab(makeUserDetail({ permissions: [] }));

    expect(await screen.findByText("ผู้ใช้นี้ยังไม่มีสิทธิ์การใช้งาน")).toBeInTheDocument();
  });

  it("groups permissions under group labels with their labels and names", async () => {
    serveLookups();
    await renderTab(makeUserDetail({ role: "officer", permissions: ["users.viewAny", "users.create", "vendors.approve"] }));

    expect(await screen.findByText("จัดการผู้ใช้")).toBeInTheDocument();
    expect(screen.getByText("จัดการผู้ค้า")).toBeInTheDocument();
    expect(within(item("users.viewAny")).getByText("ดูรายการผู้ใช้")).toBeInTheDocument();
    expect(within(item("users.create")).getByText("สร้างผู้ใช้")).toBeInTheDocument();
    expect(within(item("vendors.approve")).getByText("อนุมัติผู้ค้า")).toBeInTheDocument();
  });

  it("marks permissions that come from the role as Role and the others as Direct", async () => {
    serveLookups();
    await renderTab(makeUserDetail({ role: "officer", permissions: ["users.viewAny", "users.create"] }));

    await screen.findByText("users.viewAny");
    expect(within(item("users.viewAny")).getByText("Role")).toBeInTheDocument();
    expect(within(item("users.viewAny")).queryByText("กำหนดเอง (Direct)")).not.toBeInTheDocument();
    expect(within(item("users.create")).getByText("กำหนดเอง (Direct)")).toBeInTheDocument();
    expect(within(item("users.create")).queryByText("Role")).not.toBeInTheDocument();
  });

  it("marks everything as Direct when the user has no role", async () => {
    serveLookups();
    await renderTab(makeUserDetail({ role: null, permissions: ["users.viewAny"] }));

    await screen.findByText("users.viewAny");
    expect(within(item("users.viewAny")).getByText("กำหนดเอง (Direct)")).toBeInTheDocument();
  });

  it("marks everything as Direct when the role is not in the roles list", async () => {
    serveLookups();
    await renderTab(makeUserDetail({ role: "ghost", permissions: ["users.viewAny"] }));

    expect(await screen.findByText("ghost")).toBeInTheDocument();
    expect(within(item("users.viewAny")).getByText("กำหนดเอง (Direct)")).toBeInTheDocument();
  });

  it("falls back to the permission name and its prefix as group when metadata is unknown", async () => {
    serveLookups(ROLES, []);
    await renderTab(makeUserDetail({ role: "officer", permissions: ["reports.export"] }));

    // ไม่มี metadata → label = ชื่อ permission, group = ส่วนหน้าจุด (ไม่มีใน GROUP_LABELS จึงแสดงตรงๆ)
    expect(await screen.findByText("reports")).toBeInTheDocument();
    expect(within(item("reports.export")).getAllByText("reports.export")).toHaveLength(2);
  });
});
