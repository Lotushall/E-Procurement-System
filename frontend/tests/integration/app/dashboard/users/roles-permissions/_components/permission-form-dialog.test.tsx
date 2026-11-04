import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { PermissionFormDialog } from "@/app/dashboard/users/roles-permissions/_components/permission-form-dialog";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import type { Permission } from "@/lib/user/management/types";
import { makePermission } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/permissions");
const ITEM_URL = apiUrl("/api/v1/dashboard/permissions/:name");
const FALLBACK = "บันทึก permission ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const FORMAT_ERROR =
  "รูปแบบต้องเป็น prefix.action เช่น reports.export (prefix ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น ส่วน action อนุญาตตัวพิมพ์ใหญ่ได้ เช่น updateStatus)";

interface Sent {
  method: string;
  url: string;
  body: unknown;
}

function serve() {
  const sent: Sent[] = [];
  let listCalls = 0;
  server.use(
    http.get(LIST_URL, () => {
      listCalls += 1;
      return HttpResponse.json({ data: [] });
    }),
    http.post(LIST_URL, async ({ request }) => {
      sent.push({ method: "POST", url: new URL(request.url).pathname, body: await request.json() });
      return HttpResponse.json({ data: makePermission() }, { status: 201 });
    }),
    http.patch(ITEM_URL, async ({ request }) => {
      sent.push({ method: "PATCH", url: new URL(request.url).pathname, body: await request.json() });
      return HttpResponse.json({ data: makePermission() });
    }),
  );
  return { sent, listCalls: () => listCalls };
}

function Harness({ permission }: { permission?: Permission }) {
  usePermissions();
  return <PermissionFormDialog permission={permission} />;
}

function renderDialog(permission?: Permission) {
  const rendered = renderWithQueryClient(<Harness permission={permission} />);
  return { ...rendered, user: userEvent.setup() };
}

const createTrigger = () => screen.getByRole("button", { name: "สร้าง permission" });
const editTrigger = () => screen.getByRole("button", { name: "แก้ไข permission" });
const nameInput = () => screen.getByPlaceholderText("เช่น reports.export");
const labelInput = () => screen.getByPlaceholderText("เช่น ส่งออกรายงาน");
const submit = () =>
  within(screen.getByRole("dialog")).getByRole("button", { name: /^(สร้าง permission|บันทึกการแก้ไข)$/ });

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(createTrigger());
  await screen.findByRole("dialog");
}

async function openEdit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(editTrigger());
  await screen.findByRole("dialog");
}

async function fillValidCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.type(nameInput(), "reports.export");
  await user.type(labelInput(), "ส่งออกรายงาน");
}

describe("PermissionFormDialog — opening (create)", () => {
  it("shows only the create trigger while closed", () => {
    serve();
    renderDialog();

    expect(createTrigger()).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens with empty fields and the create description, without a group preview", async () => {
    serve();
    const { user } = renderDialog();

    await openCreate(user);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("สร้าง permission", { selector: "[data-slot='dialog-title']" })).toBeInTheDocument();
    expect(within(dialog).getByText("ตั้งชื่อและคำอธิบายสำหรับ permission ใหม่")).toBeInTheDocument();
    expect(nameInput()).toHaveValue("");
    expect(labelInput()).toHaveValue("");
    expect(screen.queryByText(/จะถูกจัดกลุ่มเป็น/)).not.toBeInTheDocument();
  });
});

describe("PermissionFormDialog — group preview", () => {
  it("stays hidden until the name contains a dot", async () => {
    serve();
    const { user } = renderDialog();
    await openCreate(user);

    await user.type(nameInput(), "users");
    expect(screen.queryByText(/จะถูกจัดกลุ่มเป็น/)).not.toBeInTheDocument();

    await user.type(nameInput(), ".");
    expect(await screen.findByText("จะถูกจัดกลุ่มเป็น: จัดการผู้ใช้")).toBeInTheDocument();
  });

  it("shows the Thai label for a known prefix and the raw prefix for an unknown one", async () => {
    serve();
    const { user } = renderDialog();
    await openCreate(user);

    await user.type(nameInput(), "vendors.approve");
    expect(await screen.findByText("จะถูกจัดกลุ่มเป็น: จัดการผู้ค้า")).toBeInTheDocument();

    await user.clear(nameInput());
    await user.type(nameInput(), "reports.export");
    expect(await screen.findByText("จะถูกจัดกลุ่มเป็น: reports")).toBeInTheDocument();
  });
});

describe("PermissionFormDialog — validation", () => {
  it("requires both fields and sends nothing", async () => {
    const { sent } = serve();
    const { user } = renderDialog();
    await openCreate(user);

    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกชื่อ permission")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอก label")).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
    expect(labelInput()).toHaveAttribute("aria-invalid", "true");
    expect(sent).toEqual([]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it.each(["reports", "Reports.export", "reports.Export", "reports.", ".export", "re-ports.export", "reports.ex port", "1reports.export"])(
    "rejects the name %j with the prefix.action error",
    async (name) => {
      const { sent } = serve();
      const { user } = renderDialog();
      await openCreate(user);
      await user.type(nameInput(), name);
      await user.type(labelInput(), "ส่งออกรายงาน");

      await user.click(submit());

      expect(await screen.findByText(FORMAT_ERROR)).toBeInTheDocument();
      expect(screen.queryByText("กรุณากรอก label")).not.toBeInTheDocument();
      expect(sent).toEqual([]);
    },
  );

  it("requires the label when the name is valid", async () => {
    const { sent } = serve();
    const { user } = renderDialog();
    await openCreate(user);
    await user.type(nameInput(), "reports.export");

    await user.click(submit());

    expect(await screen.findByText("กรุณากรอก label")).toBeInTheDocument();
    expect(screen.queryByText(FORMAT_ERROR)).not.toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it("accepts a camelCase action and an underscore prefix", async () => {
    const { sent } = serve();
    const { user } = renderDialog();
    await openCreate(user);
    await user.type(nameInput(), "tender_projects.updateStatus");
    await user.type(labelInput(), "เปลี่ยนสถานะ");

    await user.click(submit());

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].body).toEqual({ name: "tender_projects.updateStatus", label: "เปลี่ยนสถานะ" });
  });
});

describe("PermissionFormDialog — creating", () => {
  it("posts name and label, toasts, closes and refetches the permissions list", async () => {
    const { sent, listCalls } = serve();
    const { user } = renderDialog();
    await waitFor(() => expect(listCalls()).toBe(1));
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้าง permission สำเร็จ"));
    expect(sent).toEqual([
      { method: "POST", url: "/api/v1/dashboard/permissions", body: { name: "reports.export", label: "ส่งออกรายงาน" } },
    ]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls()).toBe(2));
  });

  it("starts from empty fields when reopened after a successful create", async () => {
    serve();
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);
    await user.click(submit());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await openCreate(user);

    expect(nameInput()).toHaveValue("");
    expect(labelInput()).toHaveValue("");
  });

  it("disables submit and sends a single request while the create is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [] })),
      http.post(LIST_URL, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return HttpResponse.json({ data: makePermission() }, { status: 201 });
      }),
    );
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(submit()).toBeDisabled());
    await user.click(submit());
    await user.type(labelInput(), "{Enter}");
    expect(bodies).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้าง permission สำเร็จ"));
    expect(bodies).toHaveLength(1);
  });
});

describe("PermissionFormDialog — create failures", () => {
  function serveFailure(respond: () => Response) {
    server.use(http.get(LIST_URL, () => HttpResponse.json({ data: [] })), http.post(LIST_URL, respond));
  }

  it("on a 422 toasts a check-the-form message, keeps the dialog open and keeps the values", async () => {
    serveFailure(() =>
      HttpResponse.json(
        { message: "The given data was invalid.", errors: { name: ["permission นี้มีอยู่แล้ว"], label: ["x"] } },
        { status: 422 },
      ),
    );
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(nameInput()).toHaveValue("reports.export");
    expect(labelInput()).toHaveValue("ส่งออกรายงาน");
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it("shows a 422 duplicate name on the permission name field", async () => {
    serveFailure(() =>
      HttpResponse.json(
        { message: "The given data was invalid.", errors: { name: ["permission นี้มีอยู่แล้ว"] } },
        { status: 422 },
      ),
    );
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน dialog แปลว่าแสดงที่ช่องแล้ว
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("permission นี้มีอยู่แล้ว")).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("toasts the backend message for a non-422 failure", async () => {
    serveFailure(() => HttpResponse.json({ message: "ไม่มีสิทธิ์สร้าง permission" }, { status: 403 }));
    const { user } = renderDialog();
    await openCreate(user);
    await fillValidCreate(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่มีสิทธิ์สร้าง permission"));
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

describe("PermissionFormDialog — cancelling", () => {
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
    expect(labelInput()).toHaveValue("");
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

describe("PermissionFormDialog — editing", () => {
  const PERMISSION = makePermission({ name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users" });

  it("uses an icon trigger and opens prefilled with the permission and its group preview", async () => {
    serve();
    const { user } = renderDialog(PERMISSION);
    expect(screen.queryByRole("button", { name: "สร้าง permission" })).not.toBeInTheDocument();

    await openEdit(user);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("แก้ไข permission", { selector: "[data-slot='dialog-title']" })).toBeInTheDocument();
    expect(within(dialog).getByText('แก้ไขชื่อและคำอธิบายของ permission "users.viewAny"')).toBeInTheDocument();
    expect(nameInput()).toHaveValue("users.viewAny");
    expect(labelInput()).toHaveValue("ดูรายการผู้ใช้");
    expect(within(dialog).getByText("จะถูกจัดกลุ่มเป็น: จัดการผู้ใช้")).toBeInTheDocument();
    expect(submit()).toHaveTextContent("บันทึกการแก้ไข");
  });

  it("patches by the original name with the new values, toasts, closes and refetches", async () => {
    const { sent, listCalls } = serve();
    const { user } = renderDialog(PERMISSION);
    await waitFor(() => expect(listCalls()).toBe(1));
    await openEdit(user);
    await user.clear(nameInput());
    await user.type(nameInput(), "users.list");
    await user.clear(labelInput());
    await user.type(labelInput(), "ดูผู้ใช้ทั้งหมด");

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกการแก้ไขสำเร็จ"));
    expect(sent).toEqual([
      {
        method: "PATCH",
        url: "/api/v1/dashboard/permissions/users.viewAny",
        body: { name: "users.list", label: "ดูผู้ใช้ทั้งหมด" },
      },
    ]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(listCalls()).toBe(2));
  });

  it("validates the edited name and sends nothing", async () => {
    const { sent } = serve();
    const { user } = renderDialog(PERMISSION);
    await openEdit(user);
    await user.clear(nameInput());
    await user.type(nameInput(), "nodot");

    await user.click(submit());

    expect(await screen.findByText(FORMAT_ERROR)).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it("reverts unsaved edits when cancelled", async () => {
    const { sent } = serve();
    const { user } = renderDialog(PERMISSION);
    await openEdit(user);
    await user.type(labelInput(), " แก้ไข");

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openEdit(user);

    expect(sent).toEqual([]);
    expect(labelInput()).toHaveValue("ดูรายการผู้ใช้");
  });

  it("toasts the backend message when the update fails", async () => {
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [] })),
      http.patch(ITEM_URL, () => HttpResponse.json({ message: "แก้ไข permission ระบบไม่ได้" }, { status: 403 })),
    );
    const { user } = renderDialog(PERMISSION);
    await openEdit(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("แก้ไข permission ระบบไม่ได้"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the update fails without a message", async () => {
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [] })),
      http.patch(ITEM_URL, () => new HttpResponse(null, { status: 500 })),
    );
    const { user } = renderDialog(PERMISSION);
    await openEdit(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});
