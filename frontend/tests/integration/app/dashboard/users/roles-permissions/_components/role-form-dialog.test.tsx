import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { RoleFormDialog } from "@/app/dashboard/users/roles-permissions/_components/role-form-dialog";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import type { Permission, RoleDetail } from "@/lib/user/management/types";
import { makePermission, makeRole } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const ROLES_URL = apiUrl("/api/v1/dashboard/roles");
const ROLE_URL = apiUrl("/api/v1/dashboard/roles/:id");
const PERMISSIONS_URL = apiUrl("/api/v1/dashboard/permissions");
const FALLBACK = "บันทึก role ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

const PERMISSIONS: Permission[] = [
  makePermission({ name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users" }),
  makePermission({ name: "users.create", label: "สร้างผู้ใช้", group: "users" }),
  makePermission({ name: "vendors.approve", label: "อนุมัติผู้ค้า", group: "vendors" }),
];

interface Sent {
  method: string;
  url: string;
  body: unknown;
}

function serve(permissions: Permission[] = PERMISSIONS) {
  const sent: Sent[] = [];
  let listCalls = 0;
  server.use(
    http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: permissions })),
    http.get(ROLES_URL, () => {
      listCalls += 1;
      return HttpResponse.json({ data: [] });
    }),
    http.post(ROLES_URL, async ({ request }) => {
      sent.push({ method: "POST", url: new URL(request.url).pathname, body: await request.json() });
      return HttpResponse.json({ data: makeRole({ id: 9, name: "auditor" }) }, { status: 201 });
    }),
    http.patch(ROLE_URL, async ({ request }) => {
      sent.push({ method: "PATCH", url: new URL(request.url).pathname, body: await request.json() });
      return HttpResponse.json({ data: makeRole({ id: 5 }) });
    }),
  );
  return { sent, listCalls: () => listCalls };
}

function Harness({ role }: { role?: RoleDetail }) {
  useRoles();
  return <RoleFormDialog role={role} />;
}

function renderDialog(role?: RoleDetail) {
  const rendered = renderWithQueryClient(<Harness role={role} />);
  return { ...rendered, user: userEvent.setup() };
}

const createTrigger = () => screen.getByRole("button", { name: "สร้าง role" });
const editTrigger = () => screen.getByRole("button", { name: "แก้ไข role" });
const nameInput = () => screen.getByPlaceholderText("เช่น procurement_officer");
const checkbox = (name: string) => screen.getByRole("checkbox", { name: new RegExp(name.replace(".", "\\.")) });
const submit = () => within(screen.getByRole("dialog")).getByRole("button", { name: /^(สร้าง role|บันทึกการแก้ไข)$/ });

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(createTrigger());
  await screen.findByPlaceholderText("เช่น procurement_officer");
}

async function openEdit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(editTrigger());
  await screen.findByPlaceholderText("เช่น procurement_officer");
}

async function fillValidCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.type(nameInput(), "auditor");
  await user.click(checkbox("users.viewAny"));
  await user.click(checkbox("vendors.approve"));
}

describe("RoleFormDialog — opening (create)", () => {
  it("shows only the create trigger while closed", () => {
    serve();
    renderDialog();

    expect(createTrigger()).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens with an empty name and every permission unchecked, grouped under Thai labels", async () => {
    serve();
    const { user } = renderDialog();

    await openCreate(user);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("สร้าง role", { selector: "[data-slot='dialog-title']" })).toBeInTheDocument();
    expect(nameInput()).toHaveValue("");
    expect(within(dialog).getByText("จัดการผู้ใช้")).toBeInTheDocument();
    expect(within(dialog).getByText("จัดการผู้ค้า")).toBeInTheDocument();
    for (const p of PERMISSIONS) {
      expect(checkbox(p.name)).not.toBeChecked();
      expect(within(dialog).getByText(p.label)).toBeInTheDocument();
    }
  });

  it("shows a spinner instead of the form while permissions load", async () => {
    server.use(
      http.get(PERMISSIONS_URL, () => new Promise(() => {})),
      http.get(ROLES_URL, () => HttpResponse.json({ data: [] })),
    );
    const { user } = renderDialog();

    await user.click(createTrigger());

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("เช่น procurement_officer")).not.toBeInTheDocument();
  });

  it("shows the load-error text instead of the form when permissions fail to load", async () => {
    server.use(
      http.get(PERMISSIONS_URL, () => new HttpResponse(null, { status: 500 })),
      http.get(ROLES_URL, () => HttpResponse.json({ data: [] })),
    );
    const { user } = renderDialog();

    await user.click(createTrigger());

    expect(await screen.findByText("ไม่สามารถโหลดรายการ permission ได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("เช่น procurement_officer")).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
  });
});

describe("RoleFormDialog — validation", () => {
  it("requires a name and at least one permission, and sends nothing", async () => {
    const { sent } = serve();
    const { user } = renderDialog();
    await openCreate(user);

    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกชื่อ role")).toBeInTheDocument();
    expect(screen.getByText("กรุณาเลือกอย่างน้อย 1 permission")).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
    expect(sent).toEqual([]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it.each(["Auditor", "1auditor", "audit or", "audit-or"])("rejects the name %j with the format error", async (name) => {
    const { sent } = serve();
    const { user } = renderDialog();
    await openCreate(user);
    await user.type(nameInput(), name);
    await user.click(checkbox("users.viewAny"));

    await user.click(submit());

    expect(
      await screen.findByText("ใช้ได้แค่ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)"),
    ).toBeInTheDocument();
    expect(screen.queryByText("กรุณาเลือกอย่างน้อย 1 permission")).not.toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it("requires a permission when the name is valid, and clears the error once one is ticked", async () => {
    const { sent } = serve();
    const { user } = renderDialog();
    await openCreate(user);
    await user.type(nameInput(), "auditor");

    await user.click(submit());

    expect(await screen.findByText("กรุณาเลือกอย่างน้อย 1 permission")).toBeInTheDocument();
    expect(screen.queryByText("กรุณากรอกชื่อ role")).not.toBeInTheDocument();
    expect(sent).toEqual([]);

    await user.click(checkbox("users.create"));

    await waitFor(() => expect(screen.queryByText("กรุณาเลือกอย่างน้อย 1 permission")).not.toBeInTheDocument());
  });
});

describe("RoleFormDialog — creating", () => {
  it("posts the name and selected permissions, toasts, closes and refetches the roles list", async () => {
    const { sent, listCalls } = serve();
    const { user } = renderDialog();
    await waitFor(() => expect(listCalls()).toBe(1));
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้าง role สำเร็จ"));
    expect(sent).toEqual([
      {
        method: "POST",
        url: "/api/v1/dashboard/roles",
        body: { name: "auditor", permissions: ["users.viewAny", "vendors.approve"] },
      },
    ]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls()).toBe(2));
  });

  it("starts from an empty form when reopened after a successful create", async () => {
    serve();
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);
    await user.click(submit());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await openCreate(user);

    expect(nameInput()).toHaveValue("");
    expect(checkbox("users.viewAny")).not.toBeChecked();
    expect(checkbox("vendors.approve")).not.toBeChecked();
  });

  it("disables submit and sends a single request while the create is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    server.use(
      http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: PERMISSIONS })),
      http.get(ROLES_URL, () => HttpResponse.json({ data: [] })),
      http.post(ROLES_URL, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return HttpResponse.json({ data: makeRole({ id: 9 }) }, { status: 201 });
      }),
    );
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(submit()).toBeDisabled());
    await user.click(submit());
    await user.type(nameInput(), "{Enter}");
    expect(bodies).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้าง role สำเร็จ"));
    expect(bodies).toHaveLength(1);
  });
});

describe("RoleFormDialog — create failures", () => {
  function serveFailure(respond: () => Response) {
    server.use(
      http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: PERMISSIONS })),
      http.get(ROLES_URL, () => HttpResponse.json({ data: [] })),
      http.post(ROLES_URL, respond),
    );
  }

  // current toast-only 422 behaviour — remove this test when the BUG skip below ("422 is only toasted") is fixed
  it("toasts the first 422 field message, keeps the dialog open and keeps the entered values", async () => {
    serveFailure(() =>
      HttpResponse.json(
        { message: "The given data was invalid.", errors: { name: ["ชื่อ role นี้ถูกใช้แล้ว"], permissions: ["x"] } },
        { status: 422 },
      ),
    );
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ชื่อ role นี้ถูกใช้แล้ว"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(nameInput()).toHaveValue("auditor");
    expect(checkbox("users.viewAny")).toBeChecked();
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it.skip("BUG: app/dashboard/users/roles-permissions/_hooks/use-role-form.ts:10-23 422 is only toasted; it should be shown on the field the backend names", async () => {
    serveFailure(() =>
      HttpResponse.json(
        { message: "The given data was invalid.", errors: { name: ["ชื่อ role นี้ถูกใช้แล้ว"] } },
        { status: 422 },
      ),
    );
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน dialog แปลว่าแสดงที่ช่องแล้ว
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("ชื่อ role นี้ถูกใช้แล้ว")).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("toasts the backend message for a non-422 failure", async () => {
    serveFailure(() => HttpResponse.json({ message: "ไม่มีสิทธิ์สร้าง role" }, { status: 403 }));
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่มีสิทธิ์สร้าง role"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    serveFailure(() => new HttpResponse(null, { status: 500 }));
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text when a 422 carries no errors object", async () => {
    serveFailure(() => HttpResponse.json({}, { status: 422 }));
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text on a network error", async () => {
    serveFailure(() => HttpResponse.error());
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("RoleFormDialog — cancelling", () => {
  it("closes from the cancel button, sends nothing, and discards the typed values", async () => {
    const { sent } = serve();
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sent).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();

    await openCreate(user);
    expect(nameInput()).toHaveValue("");
    expect(checkbox("users.viewAny")).not.toBeChecked();
  });

  it("closes on Escape and sends nothing", async () => {
    const { sent } = serve();
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sent).toEqual([]);
  });
});

describe("RoleFormDialog — editing", () => {
  const ROLE = makeRole({ id: 5, name: "procurement_officer", permissions: ["users.viewAny", "vendors.approve"], userCount: 2 });

  it("uses an icon trigger and opens prefilled with the role name and its permissions ticked", async () => {
    serve();
    const { user } = renderDialog(ROLE);
    expect(screen.queryByRole("button", { name: "สร้าง role" })).not.toBeInTheDocument();

    await openEdit(user);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("แก้ไข role", { selector: "[data-slot='dialog-title']" })).toBeInTheDocument();
    expect(nameInput()).toHaveValue("procurement_officer");
    expect(checkbox("users.viewAny")).toBeChecked();
    expect(checkbox("vendors.approve")).toBeChecked();
    expect(checkbox("users.create")).not.toBeChecked();
    expect(submit()).toHaveTextContent("บันทึกการแก้ไข");
  });

  it("patches the role by id with the changed values, toasts, closes and refetches", async () => {
    const { sent, listCalls } = serve();
    const { user } = renderDialog(ROLE);
    await waitFor(() => expect(listCalls()).toBe(1));
    await openEdit(user);
    await user.clear(nameInput());
    await user.type(nameInput(), "senior_officer");
    await user.click(checkbox("vendors.approve"));
    await user.click(checkbox("users.create"));

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกการแก้ไขสำเร็จ"));
    expect(sent).toEqual([
      {
        method: "PATCH",
        url: "/api/v1/dashboard/roles/5",
        body: { name: "senior_officer", permissions: ["users.viewAny", "users.create"] },
      },
    ]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls()).toBe(2));
  });

  it("validates the edited name and sends nothing", async () => {
    const { sent } = serve();
    const { user } = renderDialog(ROLE);
    await openEdit(user);
    await user.clear(nameInput());

    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกชื่อ role")).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it("reverts unsaved edits when cancelled", async () => {
    const { sent } = serve();
    const { user } = renderDialog(ROLE);
    await openEdit(user);
    await user.type(nameInput(), "_x");
    await user.click(checkbox("users.viewAny"));

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openEdit(user);

    expect(sent).toEqual([]);
    expect(nameInput()).toHaveValue("procurement_officer");
    expect(checkbox("users.viewAny")).toBeChecked();
  });

  it("toasts the backend message when the update fails", async () => {
    server.use(
      http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: PERMISSIONS })),
      http.get(ROLES_URL, () => HttpResponse.json({ data: [] })),
      http.patch(ROLE_URL, () => HttpResponse.json({ message: "แก้ไข role ระบบไม่ได้" }, { status: 403 })),
    );
    const { user } = renderDialog(ROLE);
    await openEdit(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("แก้ไข role ระบบไม่ได้"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the update fails without a message", async () => {
    server.use(
      http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: PERMISSIONS })),
      http.get(ROLES_URL, () => HttpResponse.json({ data: [] })),
      http.patch(ROLE_URL, () => new HttpResponse(null, { status: 500 })),
    );
    const { user } = renderDialog(ROLE);
    await openEdit(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});
