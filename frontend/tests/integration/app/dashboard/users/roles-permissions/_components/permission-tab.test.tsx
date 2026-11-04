import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { PermissionTab } from "@/app/dashboard/users/roles-permissions/_components/permission-tab";
import type { Permission } from "@/lib/user/management/types";
import { makePermission } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/permissions");

const PERMISSIONS = [
  makePermission({ name: "vendors.approve", label: "อนุมัติผู้ค้า", group: "vendors" }),
  makePermission({ name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users" }),
  makePermission({ name: "reports.export", label: "ส่งออกรายงาน", group: "reports" }),
  makePermission({ name: "users.create", label: "สร้างผู้ใช้", group: "users" }),
];

function serveList(permissions: Permission[]) {
  let calls = 0;
  server.use(
    http.get(LIST_URL, () => {
      calls += 1;
      return HttpResponse.json({ data: permissions });
    }),
  );
  return () => calls;
}

function card(title: string) {
  const heading = screen.getByText(title);
  return heading.closest("[data-slot='card']") as HTMLElement;
}

describe("PermissionTab — loading", () => {
  it("shows only a spinner while the list is pending", () => {
    server.use(http.get(LIST_URL, () => new Promise(() => {})));

    renderWithQueryClient(<PermissionTab />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มี permission ในระบบ")).not.toBeInTheDocument();
  });
});

describe("PermissionTab — error", () => {
  it.each([500, 404])("replaces the spinner with the load-error text on a %s", async (status) => {
    server.use(http.get(LIST_URL, () => new HttpResponse(null, { status })));

    renderWithQueryClient(<PermissionTab />);

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูล permission ได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มี permission ในระบบ")).not.toBeInTheDocument();
  });
});

describe("PermissionTab — empty", () => {
  it("says there are no permissions when the list is empty", async () => {
    serveList([]);

    renderWithQueryClient(<PermissionTab />);

    expect(await screen.findByText("ยังไม่มี permission ในระบบ")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
  });
});

describe("PermissionTab — populated", () => {
  it("groups permissions by prefix into cards ordered by prefix, using Thai labels with the raw prefix as fallback", async () => {
    serveList(PERMISSIONS);

    renderWithQueryClient(<PermissionTab />);

    await screen.findByText("จัดการผู้ใช้");
    const titles = Array.from(document.querySelectorAll("[data-slot='card-title']")).map(
      (el) => el.firstElementChild?.textContent,
    );
    expect(titles).toEqual(["reports", "จัดการผู้ใช้", "จัดการผู้ค้า"]);
  });

  it("shows the permission count per group", async () => {
    serveList(PERMISSIONS);

    renderWithQueryClient(<PermissionTab />);

    await screen.findByText("จัดการผู้ใช้");
    expect(within(card("จัดการผู้ใช้")).getByText("2 permissions")).toBeInTheDocument();
    expect(within(card("จัดการผู้ค้า")).getByText("1 permissions")).toBeInTheDocument();
    expect(within(card("reports")).getByText("1 permissions")).toBeInTheDocument();
  });

  it("lists each permission's label and name, sorted by name within its card", async () => {
    serveList(PERMISSIONS);

    renderWithQueryClient(<PermissionTab />);

    await screen.findByText("จัดการผู้ใช้");
    const users = card("จัดการผู้ใช้");
    expect(within(users).getAllByText(/^users\./).map((el) => el.textContent)).toEqual(["users.create", "users.viewAny"]);
    expect(within(users).getByText("สร้างผู้ใช้")).toBeInTheDocument();
    expect(within(users).getByText("ดูรายการผู้ใช้")).toBeInTheDocument();
    expect(within(users).queryByText("อนุมัติผู้ค้า")).not.toBeInTheDocument();
  });

  it("gives every permission its own edit and delete buttons", async () => {
    serveList(PERMISSIONS);

    renderWithQueryClient(<PermissionTab />);

    await screen.findByText("จัดการผู้ใช้");
    expect(screen.getAllByRole("button", { name: "แก้ไข permission" })).toHaveLength(PERMISSIONS.length);
    expect(screen.getAllByRole("button", { name: "ลบ permission" })).toHaveLength(PERMISSIONS.length);
  });

  it("requests the permissions list once", async () => {
    const calls = serveList(PERMISSIONS);

    renderWithQueryClient(<PermissionTab />);

    await screen.findByText("จัดการผู้ใช้");
    expect(calls()).toBe(1);
  });
});

describe("PermissionTab — row actions", () => {
  it("edits the permission of the clicked row only", async () => {
    serveList(PERMISSIONS);
    const patched: string[] = [];
    server.use(
      http.patch(apiUrl("/api/v1/dashboard/permissions/:name"), async ({ params, request }) => {
        patched.push(`${String(params.name)} ${JSON.stringify(await request.json())}`);
        return HttpResponse.json({ data: PERMISSIONS[0] });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<PermissionTab />);
    await screen.findByText("จัดการผู้ใช้");

    await user.click(within(card("reports")).getByRole("button", { name: "แก้ไข permission" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText('แก้ไขชื่อและคำอธิบายของ permission "reports.export"')).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "บันทึกการแก้ไข" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกการแก้ไขสำเร็จ"));
    expect(patched).toEqual(['reports.export {"name":"reports.export","label":"ส่งออกรายงาน"}']);
  });

  it("deletes the permission of the clicked row and refetches the list", async () => {
    let rows = PERMISSIONS;
    const calls = { list: 0 };
    const deleted: unknown[] = [];
    server.use(
      http.get(LIST_URL, () => {
        calls.list += 1;
        return HttpResponse.json({ data: rows });
      }),
      http.delete(apiUrl("/api/v1/dashboard/permissions/:name"), ({ params }) => {
        deleted.push(params.name);
        rows = rows.filter((p) => p.name !== params.name);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<PermissionTab />);
    await screen.findByText("ส่งออกรายงาน");

    await user.click(within(card("reports")).getByRole("button", { name: "ลบ permission" }));
    await user.click(await within(await screen.findByRole("alertdialog")).findByRole("button", { name: "ลบ permission" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบ permission สำเร็จ"));
    expect(deleted).toEqual(["reports.export"]);
    await waitFor(() => expect(screen.queryByText("ส่งออกรายงาน")).not.toBeInTheDocument());
    expect(calls.list).toBe(2);
    expect(screen.getByText("สร้างผู้ใช้")).toBeInTheDocument();
  });
});
