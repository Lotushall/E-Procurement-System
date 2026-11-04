import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { useState } from "react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import InternalProfileFormDialog from "@/app/dashboard/internal-employees/_components/dialogs/internal-profile-form-dialog";
import { makeDepartment, makeInternalProfile, makePosition } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const CREATE_URL = apiUrl("/api/v1/dashboard/internal-profiles");
const DEPARTMENTS_URL = apiUrl("/api/v1/dashboard/departments/select");
const POSITIONS_URL = apiUrl("/api/v1/dashboard/positions/select");
const FALLBACK = "สร้างพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const POSITIONS = [makePosition({ id: 5, name: "ผู้จัดการ" }), makePosition({ id: 6, name: "เจ้าหน้าที่" })];

function serveOptions() {
  server.use(
    http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: DEPARTMENTS })),
    http.get(POSITIONS_URL, () => HttpResponse.json({ data: POSITIONS })),
  );
}

function serveCreate() {
  const bodies: unknown[] = [];
  server.use(
    http.post(CREATE_URL, async ({ request }) => {
      bodies.push(await request.json());
      return HttpResponse.json({ data: makeInternalProfile({ id: 50 }) }, { status: 201 });
    }),
  );
  return bodies;
}

// เหมือนหน้า list: ผู้เรียกคุม open เอง
function Harness({ onOpenChange, initiallyOpen = true }: { onOpenChange?: (open: boolean) => void; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        เปิดฟอร์ม
      </button>
      <InternalProfileFormDialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange?.(next);
          setOpen(next);
        }}
      />
    </>
  );
}

function renderDialog(props: { onOpenChange?: (open: boolean) => void; initiallyOpen?: boolean } = {}) {
  serveOptions();
  const rendered = renderWithQueryClient(<Harness {...props} />);
  return { ...rendered, user: userEvent.setup() };
}

// InputField ไม่ได้ผูก <label> กับ input จึงหา control จากข้อความ label ในกลุ่มเดียวกัน
function fieldGroup(label: string): HTMLElement {
  const group = screen.getByText(label).closest("div.flex-col");
  if (!group) throw new Error(`field group not found for ${label}`);
  return group as HTMLElement;
}
const input = (label: string) => within(fieldGroup(label)).getByRole("textbox");
const combo = (label: string) => within(fieldGroup(label)).getByRole("combobox");
const submit = () => screen.getByRole("button", { name: "สร้างพนักงาน" });

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(input("ชื่อ"), "สมชาย");
  await user.type(input("นามสกุล"), "ใจดี");
}

describe("InternalProfileFormDialog — opening", () => {
  it("shows the form with every field when open", async () => {
    renderDialog();

    const dialog = await screen.findByRole("dialog", { name: "สร้างพนักงานภายใน" });
    for (const label of ["คำนำหน้า", "ชื่อ", "นามสกุล", "รหัสพนักงาน", "เบอร์โทร", "แผนก", "ตำแหน่ง"]) {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    }
    expect(within(dialog).getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
    expect(submit()).toBeEnabled();
  });

  it("renders nothing while closed and opens from the parent", async () => {
    const { user } = renderDialog({ initiallyOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "เปิดฟอร์ม" }));

    expect(await screen.findByRole("dialog", { name: "สร้างพนักงานภายใน" })).toBeInTheDocument();
  });
});

describe("InternalProfileFormDialog — validation", () => {
  it("requires first name and last name and sends no request", async () => {
    const bodies = serveCreate();
    const { user } = renderDialog();
    await screen.findByRole("dialog");

    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกชื่อ")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกนามสกุล")).toBeInTheDocument();
    expect(bodies).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("still requires the last name when only the first name is filled", async () => {
    const bodies = serveCreate();
    const { user } = renderDialog();
    await screen.findByRole("dialog");

    await user.type(input("ชื่อ"), "สมชาย");
    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกนามสกุล")).toBeInTheDocument();
    expect(screen.queryByText("กรุณากรอกชื่อ")).not.toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("marks the empty required inputs invalid", async () => {
    const { user } = renderDialog();
    await screen.findByRole("dialog");

    await user.click(submit());

    await waitFor(() => expect(input("ชื่อ")).toHaveAttribute("aria-invalid", "true"));
    expect(input("นามสกุล")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("InternalProfileFormDialog — submitting", () => {
  it("sends only the required fields when the optional ones are left empty", async () => {
    const bodies = serveCreate();
    const { user } = renderDialog();
    await screen.findByRole("dialog");

    await fillRequired(user);
    await user.click(submit());

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ firstname: "สมชาย", lastname: "ใจดี" });
  });

  it("sends every field, with ids as numbers and the phone formatted", async () => {
    const bodies = serveCreate();
    const { user } = renderDialog();
    await screen.findByRole("dialog");

    await user.click(combo("คำนำหน้า"));
    await user.click(await screen.findByRole("option", { name: "นาง" }));
    await fillRequired(user);
    await user.type(input("รหัสพนักงาน"), "EMP-777");
    await user.type(input("เบอร์โทร"), "0812345678");
    await user.click(combo("แผนก"));
    await user.click(await screen.findByRole("option", { name: "บัญชี" }));
    await user.click(combo("ตำแหน่ง"));
    await user.click(await screen.findByRole("option", { name: "ผู้จัดการ" }));
    expect(input("เบอร์โทร")).toHaveValue("081-234-5678");
    await user.click(submit());

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      prefix: "นาง",
      firstname: "สมชาย",
      lastname: "ใจดี",
      employeeNo: "EMP-777",
      departmentId: 2,
      positionId: 5,
      phone: "081-234-5678",
    });
  });

  it("omits the department when the dash option is chosen again", async () => {
    const bodies = serveCreate();
    const { user } = renderDialog();
    await screen.findByRole("dialog");
    await fillRequired(user);

    await user.click(combo("แผนก"));
    await user.click(await screen.findByRole("option", { name: "จัดซื้อ" }));
    await user.click(combo("แผนก"));
    await user.click(await screen.findByRole("option", { name: "---" }));
    await user.click(submit());

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ firstname: "สมชาย", lastname: "ใจดี" });
  });

  it("limits the phone input to ten digits", async () => {
    const { user } = renderDialog();
    await screen.findByRole("dialog");

    await user.type(input("เบอร์โทร"), "08123456789999");

    expect(input("เบอร์โทร")).toHaveValue("081-234-5678");
  });

  it("toasts, closes and clears the form after a successful create", async () => {
    serveCreate();
    const onOpenChange = vi.fn();
    const { user } = renderDialog({ onOpenChange });
    await screen.findByRole("dialog");
    await fillRequired(user);
    await user.type(input("รหัสพนักงาน"), "EMP-1");

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้างพนักงานสำเร็จ"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "เปิดฟอร์ม" }));
    await screen.findByRole("dialog");
    expect(input("ชื่อ")).toHaveValue("");
    expect(input("นามสกุล")).toHaveValue("");
    expect(input("รหัสพนักงาน")).toHaveValue("");
  });

  it("disables the submit button and sends one request while the create is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    server.use(
      http.post(CREATE_URL, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return HttpResponse.json({ data: makeInternalProfile() }, { status: 201 });
      }),
    );
    const { user } = renderDialog();
    await screen.findByRole("dialog");
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(submit()).toBeDisabled());
    await user.click(submit());
    expect(bodies).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้างพนักงานสำเร็จ"));
    expect(bodies).toHaveLength(1);
  });
});

describe("InternalProfileFormDialog — failures", () => {
  // current toast-only 422 behaviour — remove this test when the BUG skip below ("422 is only toasted") is fixed
  it("shows the first field error of a 422 as the toast and keeps the dialog and values", async () => {
    server.use(
      http.post(CREATE_URL, () =>
        HttpResponse.json(
          { message: "ข้อมูลไม่ถูกต้อง", errors: { employee_no: ["รหัสพนักงานนี้ถูกใช้แล้ว"], phone: ["เบอร์ไม่ถูกต้อง"] } },
          { status: 422 },
        ),
      ),
    );
    const onOpenChange = vi.fn();
    const { user } = renderDialog({ onOpenChange });
    await screen.findByRole("dialog");
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("รหัสพนักงานนี้ถูกใช้แล้ว"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(input("ชื่อ")).toHaveValue("สมชาย");
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it.skip("BUG: app/dashboard/internal-employees/_hooks/use-internal-profile-form.ts:9-22 422 is only toasted; it should be shown on the field the backend names", async () => {
    server.use(
      http.post(CREATE_URL, () =>
        HttpResponse.json(
          { message: "ข้อมูลไม่ถูกต้อง", errors: { employeeNo: ["รหัสพนักงานนี้ถูกใช้แล้ว"] } },
          { status: 422 },
        ),
      ),
    );
    const { user } = renderDialog();
    await screen.findByRole("dialog");
    await fillRequired(user);
    await user.type(input("รหัสพนักงาน"), "E001");

    await user.click(submit());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน dialog แปลว่าแสดงที่ช่องแล้ว
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("รหัสพนักงานนี้ถูกใช้แล้ว")).toBeInTheDocument();
    expect(input("รหัสพนักงาน")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the backend message for a 422 that carries no field errors", async () => {
    server.use(http.post(CREATE_URL, () => HttpResponse.json({ message: "ไม่ผ่าน" }, { status: 422 })));
    const { user } = renderDialog();
    await screen.findByRole("dialog");
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่ผ่าน"));
  });

  it("shows the backend message for other failures", async () => {
    server.use(http.post(CREATE_URL, () => HttpResponse.json({ message: "ไม่มีสิทธิ์สร้างพนักงาน" }, { status: 403 })));
    const onOpenChange = vi.fn();
    const { user } = renderDialog({ onOpenChange });
    await screen.findByRole("dialog");
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่มีสิทธิ์สร้างพนักงาน"));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    server.use(http.post(CREATE_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = renderDialog();
    await screen.findByRole("dialog");
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text on a network error", async () => {
    server.use(http.post(CREATE_URL, () => HttpResponse.error()));
    const { user } = renderDialog();
    await screen.findByRole("dialog");
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("InternalProfileFormDialog — cancelling", () => {
  it("closes from the cancel button without sending a request", async () => {
    const bodies = serveCreate();
    const onOpenChange = vi.fn();
    const { user } = renderDialog({ onOpenChange });
    await screen.findByRole("dialog");
    await fillRequired(user);

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(bodies).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("closes on Escape and forgets what was typed", async () => {
    const bodies = serveCreate();
    const { user } = renderDialog();
    await screen.findByRole("dialog");
    await user.type(input("ชื่อ"), "ค้างไว้");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "เปิดฟอร์ม" }));

    await screen.findByRole("dialog");
    expect(input("ชื่อ")).toHaveValue("");
    expect(bodies).toEqual([]);
  });

  it("clears validation errors when the dialog is cancelled and reopened", async () => {
    const { user } = renderDialog();
    await screen.findByRole("dialog");
    await user.click(submit());
    await screen.findByText("กรุณากรอกชื่อ");

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "เปิดฟอร์ม" }));

    await screen.findByRole("dialog");
    expect(screen.queryByText("กรุณากรอกชื่อ")).not.toBeInTheDocument();
  });
});
