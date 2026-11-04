import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { useState } from "react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import EditInternalProfileDialog from "@/app/dashboard/internal-employees/_components/dialogs/edit-internal-profile-dialog";
import { LOAD_ERROR_MESSAGE } from "@/lib/detail-page";
import type { InternalProfile } from "@/lib/internal-profiles/types";
import { makeDepartment, makeInternalProfile, makePosition } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DETAIL_URL = apiUrl("/api/v1/dashboard/internal-profiles/:id");
const DEPARTMENTS_URL = apiUrl("/api/v1/dashboard/departments/select");
const POSITIONS_URL = apiUrl("/api/v1/dashboard/positions/select");
const FALLBACK = "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const POSITIONS = [makePosition({ id: 5, name: "ผู้จัดการ" }), makePosition({ id: 6, name: "เจ้าหน้าที่" })];

const PROFILE = makeInternalProfile({
  id: 31,
  prefix: "นาย",
  firstname: "สมชาย",
  lastname: "ใจดี",
  employeeNo: "EMP-031",
  phone: "081-234-5678",
  department: DEPARTMENTS[0],
  position: POSITIONS[1],
});

// เซิร์ฟเวอร์จำลอง: GET รายละเอียด + PATCH (เก็บ request ไว้ตรวจ)
function serve(profile: InternalProfile | null = PROFILE) {
  const state = { detailRequests: [] as string[], patches: [] as { id: unknown; body: unknown }[] };
  server.use(
    http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: DEPARTMENTS })),
    http.get(POSITIONS_URL, () => HttpResponse.json({ data: POSITIONS })),
    http.get(DETAIL_URL, ({ params }) => {
      state.detailRequests.push(String(params.id));
      if (!profile) return HttpResponse.json({ message: "Not found" }, { status: 404 });
      return HttpResponse.json({ data: profile });
    }),
    http.patch(DETAIL_URL, async ({ params, request }) => {
      state.patches.push({ id: params.id, body: await request.json() });
      return HttpResponse.json({ data: profile });
    }),
  );
  return state;
}

function renderUncontrolled(id = 31) {
  const rendered = renderWithQueryClient(<EditInternalProfileDialog id={id} />);
  return { ...rendered, user: userEvent.setup() };
}

function ControlledHarness({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        เปิดจากภายนอก
      </button>
      <EditInternalProfileDialog
        id={31}
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          setOpen(next);
        }}
      />
    </>
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "แก้ไขพนักงาน" }));
  await screen.findByRole("dialog", { name: "แก้ไขข้อมูลพนักงาน" });
  // ฟอร์มขึ้นหลังรายละเอียดโหลดเสร็จ
  await waitFor(() => expect(input("ชื่อ")).toHaveValue("สมชาย"));
}

function fieldGroup(label: string): HTMLElement {
  const group = screen.getByText(label).closest("div.flex-col");
  if (!group) throw new Error(`field group not found for ${label}`);
  return group as HTMLElement;
}
const input = (label: string) => within(fieldGroup(label)).getByRole("textbox");
const combo = (label: string) => within(fieldGroup(label)).getByRole("combobox");
const submit = () => screen.getByRole("button", { name: "บันทึกการแก้ไข" });

describe("EditInternalProfileDialog — opening", () => {
  it("shows only the trigger and requests nothing while closed", async () => {
    const state = serve();
    renderUncontrolled();

    expect(screen.getByRole("button", { name: "แก้ไขพนักงาน" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // รอให้ query ของ select (ที่ยิงตอน mount) จบ แล้วเช็คว่าไม่มีการโหลดรายละเอียด
    await screen.findByRole("button", { name: "แก้ไขพนักงาน" });
    expect(state.detailRequests).toEqual([]);
  });

  it("loads the profile by id and prefills every field", async () => {
    const state = serve();
    const { user } = renderUncontrolled();

    await openDialog(user);

    expect(state.detailRequests).toEqual(["31"]);
    expect(input("นามสกุล")).toHaveValue("ใจดี");
    expect(input("รหัสพนักงาน")).toHaveValue("EMP-031");
    expect(input("เบอร์โทร")).toHaveValue("081-234-5678");
    expect(combo("คำนำหน้า")).toHaveTextContent("นาย");
    await waitFor(() => expect(combo("แผนก")).toHaveTextContent("จัดซื้อ"));
    expect(combo("ตำแหน่ง")).toHaveTextContent("เจ้าหน้าที่");
  });

  it("shows a spinner instead of the form while the profile is loading", async () => {
    server.use(
      http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: DEPARTMENTS })),
      http.get(POSITIONS_URL, () => HttpResponse.json({ data: POSITIONS })),
      http.get(DETAIL_URL, () => new Promise<never>(() => {})),
    );
    const { user } = renderUncontrolled();

    await user.click(screen.getByRole("button", { name: "แก้ไขพนักงาน" }));

    const dialog = await screen.findByRole("dialog", { name: "แก้ไขข้อมูลพนักงาน" });
    expect(within(dialog).getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึกการแก้ไข" })).not.toBeInTheDocument();
  });

  it("shows a load error instead of the form when the profile fails to load, and closes", async () => {
    const state = serve(null);
    const { user } = renderUncontrolled();

    await user.click(screen.getByRole("button", { name: "แก้ไขพนักงาน" }));

    expect(await screen.findByText(LOAD_ERROR_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึกการแก้ไข" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ปิด" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(state.patches).toEqual([]);
  });

  it("leaves department and position on the dash for a profile that has neither", async () => {
    serve(makeInternalProfile({ id: 31, department: null, position: null, employeeNo: "", phone: "" }));
    const { user } = renderUncontrolled();

    await openDialog(user);

    expect(combo("แผนก")).toHaveTextContent("---");
    expect(combo("ตำแหน่ง")).toHaveTextContent("---");
    expect(input("เบอร์โทร")).toHaveValue("");
  });
});

describe("EditInternalProfileDialog — validation", () => {
  it("requires first and last name and sends no request", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.clear(input("ชื่อ"));
    await user.clear(input("นามสกุล"));
    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกชื่อ")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกนามสกุล")).toBeInTheDocument();
    expect(state.patches).toEqual([]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("EditInternalProfileDialog — submitting", () => {
  it("patches the profile id with the unchanged values when nothing was edited", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);
    await waitFor(() => expect(combo("แผนก")).toHaveTextContent("จัดซื้อ"));

    await user.click(submit());

    await waitFor(() => expect(state.patches).toHaveLength(1));
    expect(state.patches[0]).toEqual({
      id: "31",
      body: {
        prefix: "นาย",
        firstname: "สมชาย",
        lastname: "ใจดี",
        employeeNo: "EMP-031",
        departmentId: 1,
        positionId: 6,
        phone: "081-234-5678",
      },
    });
  });

  it("sends the edited values with numeric ids and a formatted phone", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(combo("คำนำหน้า"));
    await user.click(await screen.findByRole("option", { name: "นาง" }));
    await user.clear(input("ชื่อ"));
    await user.type(input("ชื่อ"), "สมหญิง");
    await user.clear(input("เบอร์โทร"));
    await user.type(input("เบอร์โทร"), "0899998888");
    await user.click(combo("แผนก"));
    await user.click(await screen.findByRole("option", { name: "บัญชี" }));
    await user.click(combo("ตำแหน่ง"));
    await user.click(await screen.findByRole("option", { name: "ผู้จัดการ" }));
    await user.click(submit());

    await waitFor(() => expect(state.patches).toHaveLength(1));
    expect(state.patches[0].body).toEqual({
      prefix: "นาง",
      firstname: "สมหญิง",
      lastname: "ใจดี",
      employeeNo: "EMP-031",
      departmentId: 2,
      positionId: 5,
      phone: "089-999-8888",
    });
  });

  it("omits optional fields that were cleared", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);
    await waitFor(() => expect(combo("แผนก")).toHaveTextContent("จัดซื้อ"));

    await user.clear(input("รหัสพนักงาน"));
    await user.clear(input("เบอร์โทร"));
    await user.click(combo("แผนก"));
    await user.click(await screen.findByRole("option", { name: "---" }));
    await user.click(combo("ตำแหน่ง"));
    await user.click(await screen.findByRole("option", { name: "---" }));
    await user.click(submit());

    await waitFor(() => expect(state.patches).toHaveLength(1));
    expect(state.patches[0].body).toEqual({ prefix: "นาย", firstname: "สมชาย", lastname: "ใจดี" });
  });

  it("toasts and closes after a successful save", async () => {
    serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลสำเร็จ"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("disables the save button and sends one request while the save is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const patches: unknown[] = [];
    serve();
    server.use(
      http.patch(DETAIL_URL, async ({ request }) => {
        patches.push(await request.json());
        await gate;
        return HttpResponse.json({ data: PROFILE });
      }),
    );
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(submit()).toBeDisabled());
    await user.click(submit());
    expect(patches).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลสำเร็จ"));
    expect(patches).toHaveLength(1);
  });
});

describe("EditInternalProfileDialog — failures", () => {
  it("on a 422 toasts a check-the-form message and stays open with the edits", async () => {
    serve();
    server.use(
      http.patch(DETAIL_URL, () =>
        HttpResponse.json({ message: "ข้อมูลไม่ถูกต้อง", errors: { employeeNo: ["รหัสพนักงานซ้ำ"] } }, { status: 422 }),
      ),
    );
    const { user } = renderUncontrolled();
    await openDialog(user);
    await user.clear(input("ชื่อ"));
    await user.type(input("ชื่อ"), "แก้ไข");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(input("ชื่อ")).toHaveValue("แก้ไข");
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it("shows a 422 duplicate employee number on the employee number field", async () => {
    serve();
    server.use(
      http.patch(DETAIL_URL, () =>
        HttpResponse.json({ message: "ข้อมูลไม่ถูกต้อง", errors: { employeeNo: ["รหัสพนักงานซ้ำ"] } }, { status: 422 }),
      ),
    );
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน dialog แปลว่าแสดงที่ช่องแล้ว
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByText("รหัสพนักงานซ้ำ")).toBeInTheDocument();
    expect(input("รหัสพนักงาน")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the backend message for other failures", async () => {
    serve();
    server.use(http.patch(DETAIL_URL, () => HttpResponse.json({ message: "ไม่มีสิทธิ์แก้ไข" }, { status: 403 })));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่มีสิทธิ์แก้ไข"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    serve();
    server.use(http.patch(DETAIL_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("shows the backend message for a 422 that carries no field errors", async () => {
    serve();
    server.use(http.patch(DETAIL_URL, () => HttpResponse.json({ message: "ไม่ผ่าน" }, { status: 422 })));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่ผ่าน"));
  });
});

describe("EditInternalProfileDialog — cancelling", () => {
  it("closes from the cancel button without a request and discards edits", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);
    await user.clear(input("ชื่อ"));
    await user.type(input("ชื่อ"), "ยังไม่บันทึก");

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "แก้ไขพนักงาน" }));

    await screen.findByRole("dialog");
    await waitFor(() => expect(input("ชื่อ")).toHaveValue("สมชาย"));
    expect(state.patches).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("closes on Escape without a request", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(state.patches).toEqual([]);
  });
});

describe("EditInternalProfileDialog — controlled by the parent", () => {
  it("has no trigger of its own and opens from the open prop", async () => {
    const state = serve();
    renderWithQueryClient(<ControlledHarness onOpenChange={vi.fn()} />);

    expect(await screen.findByRole("dialog", { name: "แก้ไขข้อมูลพนักงาน" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "แก้ไขพนักงาน" })).not.toBeInTheDocument();
    await waitFor(() => expect(input("ชื่อ")).toHaveValue("สมชาย"));
    expect(state.detailRequests).toEqual(["31"]);
  });

  it("asks the parent to close after a successful save", async () => {
    serve();
    const onOpenChange = vi.fn();
    renderWithQueryClient(<ControlledHarness onOpenChange={onOpenChange} />);
    const user = userEvent.setup();
    await waitFor(() => expect(input("ชื่อ")).toHaveValue("สมชาย"));

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลสำเร็จ"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("asks the parent to close when cancelled", async () => {
    serve();
    const onOpenChange = vi.fn();
    renderWithQueryClient(<ControlledHarness onOpenChange={onOpenChange} />);
    const user = userEvent.setup();
    await waitFor(() => expect(input("ชื่อ")).toHaveValue("สมชาย"));

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
