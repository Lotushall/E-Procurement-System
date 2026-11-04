import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { useState } from "react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { EditTenderProjectDialog } from "@/app/dashboard/tender-projects/_components/dialogs/edit-tender-project-dialog";
import type { TenderProjects } from "@/lib/tender/tender-projects/types";
import { makeDepartment, makeInternalProfile, makeInternalProfileOption } from "@/tests/fixtures/internal-profiles";
import { makeTenderProject } from "@/tests/fixtures/tender-projects";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { apiUrl, server } from "@/tests/msw/server";

// ปีงบประมาณของ dialog คำนวณตอน import module — ต้องล็อกเวลาก่อน import ทั้งหมด
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T10:00:00+07:00"));
});
freezeTimeAt("2026-11-02T10:00:00+07:00");

const UPDATE_URL = apiUrl("/api/v1/dashboard/tender-projects/:id");
const DEPARTMENTS_URL = apiUrl("/api/v1/dashboard/departments/select");
const PROFILES_URL = apiUrl("/api/v1/dashboard/internal-profiles/select");
const FALLBACK = "บันทึกการแก้ไขไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const TITLE = "แก้ไขโครงการจัดซื้อจัดจ้าง";

const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const PROFILES = [
  makeInternalProfileOption({ id: 7, name: "สมหญิง รักงาน" }),
  makeInternalProfileOption({ id: 8, name: "สมศักดิ์ ทำดี" }),
];

const PROJECT = makeTenderProject({
  id: 42,
  projectCode: "TP-2569-042",
  name: "จัดซื้อครุภัณฑ์คอมพิวเตอร์",
  description: "จัดซื้อคอมพิวเตอร์สำหรับสำนักงาน",
  budget: "1000000.00",
  department: DEPARTMENTS[0],
  personInCharge: makeInternalProfile({ id: 7, firstname: "สมหญิง", lastname: "รักงาน" }),
  procurementMethod: "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
  fiscalYear: 2569,
  projectStartAt: "2026-01-01T00:00:00.000000Z",
  projectEndAt: "2026-12-31T00:00:00.000000Z",
});

function serve() {
  const state = { puts: [] as { id: unknown; body: unknown }[] };
  server.use(
    http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: DEPARTMENTS })),
    http.get(PROFILES_URL, () => HttpResponse.json({ data: PROFILES })),
    http.put(UPDATE_URL, async ({ params, request }) => {
      state.puts.push({ id: params.id, body: await request.json() });
      return HttpResponse.json({ data: { projectCode: "TP-2569-042" } });
    }),
  );
  return state;
}

function renderUncontrolled(project: TenderProjects = PROJECT) {
  const rendered = renderWithQueryClient(
    <EditTenderProjectDialog
      project={project}
      trigger={<button type="button" aria-label="แก้ไขโครงการ" />}
      triggerChildren="แก้ไข"
    />,
  );
  return { ...rendered, user: userEvent.setup() };
}

function ControlledHarness({
  project = PROJECT,
  onOpenChange,
}: {
  project?: TenderProjects;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <EditTenderProjectDialog
      project={project}
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setOpen(next);
      }}
    />
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function openDialog(user: User) {
  await user.click(screen.getByRole("button", { name: "แก้ไขโครงการ" }));
  await screen.findByRole("dialog", { name: TITLE });
}

function fieldGroup(label: string): HTMLElement {
  const group = screen.getByText(label).closest("div.flex-col");
  if (!group) throw new Error(`field group not found for ${label}`);
  return group as HTMLElement;
}
const textbox = (label: string) => within(fieldGroup(label)).getByRole("textbox");
const combo = (label: string) => within(fieldGroup(label)).getByRole("combobox");
const submit = () => screen.getByRole("button", { name: "บันทึกการแก้ไข" });

async function pickOption(user: User, label: string, option: string) {
  await user.click(combo(label));
  await user.click(await screen.findByRole("option", { name: option }));
}

async function closePopover(user: User) {
  // คลิกนอก popover เพื่อปิด (Escape จะปิดทั้ง dialog)
  await user.click(screen.getByRole("heading", { name: TITLE }));
  await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
}

describe("EditTenderProjectDialog — opening", () => {
  it("shows only the trigger while closed", () => {
    serve();
    renderUncontrolled();

    expect(screen.getByRole("button", { name: "แก้ไขโครงการ" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("prefills every field from the project", async () => {
    serve();
    const { user } = renderUncontrolled();

    await openDialog(user);

    expect(textbox("ชื่อโครงการ")).toHaveValue("จัดซื้อครุภัณฑ์คอมพิวเตอร์");
    await waitFor(() => expect(combo("แผนก")).toHaveTextContent("จัดซื้อ"));
    await waitFor(() => expect(combo("ผู้รับผิดชอบ")).toHaveTextContent("สมหญิง รักงาน"));
    expect(textbox("งบประมาณ")).toHaveValue("1,000,000");
    expect(combo("วิธีจัดซื้อ")).toHaveTextContent("ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)");
    expect(combo("ปีงบประมาณ")).toHaveTextContent("ปีงบประมาณ 2569");
    expect(screen.getByRole("button", { name: /1 ม\.ค\. \d{4} ถึง 31 ธ\.ค\. \d{4}/ })).toBeInTheDocument();
    expect(textbox("รายละเอียด")).toHaveValue("จัดซื้อคอมพิวเตอร์สำหรับสำนักงาน");
  });

  it("keeps the satang of the budget when the amount is not whole", async () => {
    serve();
    const { user } = renderUncontrolled(makeTenderProject({ id: 42, budget: "500000.50" }));

    await openDialog(user);

    expect(textbox("งบประมาณ")).toHaveValue("500,000.50");
  });

  it("leaves the optional fields empty for a project that has none of them", async () => {
    serve();
    const { user } = renderUncontrolled(
      makeTenderProject({
        id: 42,
        description: undefined,
        personInCharge: null,
        projectStartAt: undefined,
        projectEndAt: undefined,
      }),
    );

    await openDialog(user);

    expect(textbox("รายละเอียด")).toHaveValue("");
    expect(combo("ผู้รับผิดชอบ")).toHaveTextContent("---");
    expect(screen.getByRole("button", { name: /เลือกระยะเวลาโครงการ/ })).toBeInTheDocument();
  });

  it("is not gated by the project status: it opens for a project in any status", async () => {
    serve();
    const { user } = renderUncontrolled(makeTenderProject({ id: 42, status: "completed" }));

    await openDialog(user);

    expect(submit()).toBeEnabled();
  });
});

describe("EditTenderProjectDialog — validation", () => {
  it("requires name and budget and sends no request", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.clear(textbox("ชื่อโครงการ"));
    await user.clear(textbox("งบประมาณ"));
    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกชื่อโครงการ")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกงบประมาณ")).toBeInTheDocument();
    expect(state.puts).toEqual([]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("requires a department when the project has none", async () => {
    const state = serve();
    const { user } = renderUncontrolled(makeTenderProject({ id: 42, department: null as never }));
    await openDialog(user);

    await user.click(submit());

    expect(await screen.findByText("กรุณาเลือกแผนก")).toBeInTheDocument();
    expect(state.puts).toEqual([]);
  });

  it("rejects a budget of zero", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.clear(textbox("งบประมาณ"));
    await user.type(textbox("งบประมาณ"), "0");
    await user.click(submit());

    expect(await screen.findByText("งบประมาณต้องมากกว่า 0")).toBeInTheDocument();
    expect(state.puts).toEqual([]);
  });

  it("rejects a budget above the maximum", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.clear(textbox("งบประมาณ"));
    await user.type(textbox("งบประมาณ"), "1000000000000");
    await user.click(submit());

    expect(await screen.findByText("งบประมาณไม่ถูกต้อง")).toBeInTheDocument();
    expect(state.puts).toEqual([]);
  });

  it("rejects a budget that is not a number", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.clear(textbox("งบประมาณ"));
    await user.type(textbox("งบประมาณ"), ".");
    await user.click(submit());

    expect(await screen.findByText("งบประมาณไม่ถูกต้อง")).toBeInTheDocument();
    expect(state.puts).toEqual([]);
  });

  it("blocks a project whose end day is before its start day", async () => {
    const state = serve();
    const { user } = renderUncontrolled(
      makeTenderProject({
        id: 42,
        projectStartAt: "2026-12-31T00:00:00.000000Z",
        projectEndAt: "2026-01-01T00:00:00.000000Z",
      }),
    );
    await openDialog(user);

    await user.click(submit());

    expect(await screen.findByText("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น")).toBeInTheDocument();
    expect(state.puts).toEqual([]);
  });
});

describe("EditTenderProjectDialog — submitting", () => {
  it("puts the project id with the unchanged values converted to the API shape", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(state.puts).toHaveLength(1));
    expect(state.puts[0]).toEqual({
      id: "42",
      body: {
        name: "จัดซื้อครุภัณฑ์คอมพิวเตอร์",
        description: "จัดซื้อคอมพิวเตอร์สำหรับสำนักงาน",
        budget: 1000000,
        departmentId: 1,
        personInChargeId: 7,
        procurementMethod: "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
        fiscalYear: 2569,
        projectStartAt: "2026-01-01",
        projectEndAt: "2026-12-31",
      },
    });
  });

  it("sends the edited values with numeric ids and ISO days", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.clear(textbox("ชื่อโครงการ"));
    await user.type(textbox("ชื่อโครงการ"), "ชื่อใหม่");
    await pickOption(user, "แผนก", "บัญชี");
    await pickOption(user, "ผู้รับผิดชอบ", "สมศักดิ์ ทำดี");
    await user.clear(textbox("งบประมาณ"));
    await user.type(textbox("งบประมาณ"), "2500000.75");
    await pickOption(user, "วิธีจัดซื้อ", "เฉพาะเจาะจง");
    await pickOption(user, "ปีงบประมาณ", "ปีงบประมาณ 2570");
    await user.click(screen.getByRole("button", { name: /ถึง/ }));
    // ปฏิทินเปิดที่เดือนเริ่มต้นเดิม (ม.ค. 2026) — ล้างช่วงเดิมก่อนแล้วเลือกใหม่
    await user.click(await screen.findByRole("button", { name: "ล้างค่า" }));
    await user.click(await screen.findByRole("button", { name: "วันพฤหัสบดีที่ 15 มกราคม 2026" }));
    await user.click(await screen.findByRole("button", { name: "วันอังคารที่ 20 มกราคม 2026" }));
    await closePopover(user);
    await user.clear(textbox("รายละเอียด"));
    await user.type(textbox("รายละเอียด"), "รายละเอียดใหม่");

    await user.click(submit());

    await waitFor(() => expect(state.puts).toHaveLength(1));
    expect(state.puts[0]).toEqual({
      id: "42",
      body: {
        name: "ชื่อใหม่",
        description: "รายละเอียดใหม่",
        budget: 2500000.75,
        departmentId: 2,
        personInChargeId: 8,
        procurementMethod: "เฉพาะเจาะจง",
        fiscalYear: 2570,
        projectStartAt: "2026-01-15",
        projectEndAt: "2026-01-20",
      },
    });
  });

  it("omits the description, person in charge and days that were cleared", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);
    await waitFor(() => expect(combo("ผู้รับผิดชอบ")).toHaveTextContent("สมหญิง รักงาน"));

    await user.clear(textbox("รายละเอียด"));
    await pickOption(user, "ผู้รับผิดชอบ", "---");
    await user.click(screen.getByRole("button", { name: /ถึง/ }));
    await user.click(await screen.findByRole("button", { name: "ล้างค่า" }));
    await closePopover(user);
    await user.click(submit());

    await waitFor(() => expect(state.puts).toHaveLength(1));
    expect(state.puts[0]).toEqual({
      id: "42",
      body: {
        name: "จัดซื้อครุภัณฑ์คอมพิวเตอร์",
        budget: 1000000,
        departmentId: 1,
        procurementMethod: "ประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
        fiscalYear: 2569,
      },
    });
  });

  it("allows the start day to equal the end day", async () => {
    const state = serve();
    const { user } = renderUncontrolled(
      makeTenderProject({
        id: 42,
        projectStartAt: "2026-06-10T00:00:00.000000Z",
        projectEndAt: "2026-06-10T00:00:00.000000Z",
      }),
    );
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(state.puts).toHaveLength(1));
    expect(state.puts[0]).toMatchObject({ body: { projectStartAt: "2026-06-10", projectEndAt: "2026-06-10" } });
  });

  it("toasts, closes the dialog and invalidates the project list", async () => {
    serve();
    const { user, queryClient } = renderUncontrolled();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกการแก้ไขสำเร็จ"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });

  it("disables the button and sends one request while the save is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const puts: unknown[] = [];
    serve();
    server.use(
      http.put(UPDATE_URL, async ({ request }) => {
        puts.push(await request.json());
        await gate;
        return HttpResponse.json({ data: { projectCode: "TP-2569-042" } });
      }),
    );
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(submit()).toBeDisabled());
    await user.click(submit());
    expect(puts).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกการแก้ไขสำเร็จ"));
    expect(puts).toHaveLength(1);
  });
});

describe("EditTenderProjectDialog — failures", () => {
  it("on a 422 toasts a check-the-form message, stays open with the edits and re-enables the button", async () => {
    serve();
    server.use(
      http.put(UPDATE_URL, () =>
        HttpResponse.json(
          { message: "ข้อมูลไม่ถูกต้อง", errors: { name: ["ชื่อโครงการซ้ำ"], budget: ["งบประมาณไม่ถูกต้อง"] } },
          { status: 422 },
        ),
      ),
    );
    const { user, queryClient } = renderUncontrolled();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await openDialog(user);
    await user.clear(textbox("ชื่อโครงการ"));
    await user.type(textbox("ชื่อโครงการ"), "แก้ไข");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(textbox("ชื่อโครงการ")).toHaveValue("แก้ไข");
    await waitFor(() => expect(submit()).toBeEnabled());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });

  it("shows a 422 duplicate name on the project name field", async () => {
    serve();
    server.use(
      http.put(UPDATE_URL, () =>
        HttpResponse.json({ message: "ข้อมูลไม่ถูกต้อง", errors: { name: ["ชื่อโครงการซ้ำ"] } }, { status: 422 }),
      ),
    );
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน dialog แปลว่าแสดงที่ช่องแล้ว
    expect(await within(screen.getByRole("dialog")).findByText("ชื่อโครงการซ้ำ")).toBeInTheDocument();
    expect(textbox("ชื่อโครงการ")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the backend message for other failures", async () => {
    serve();
    server.use(http.put(UPDATE_URL, () => HttpResponse.json({ message: "ไม่มีสิทธิ์แก้ไข" }, { status: 403 })));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่มีสิทธิ์แก้ไข"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    serve();
    server.use(http.put(UPDATE_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text for a 422 with neither field errors nor a message", async () => {
    serve();
    server.use(http.put(UPDATE_URL, () => HttpResponse.json({}, { status: 422 })));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("EditTenderProjectDialog — cancelling", () => {
  it("closes from the cancel button without a request and restores the project values on reopening", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);
    await user.clear(textbox("ชื่อโครงการ"));
    await user.type(textbox("ชื่อโครงการ"), "ยังไม่บันทึก");

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openDialog(user);

    expect(textbox("ชื่อโครงการ")).toHaveValue("จัดซื้อครุภัณฑ์คอมพิวเตอร์");
    expect(state.puts).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("closes on Escape without a request", async () => {
    const state = serve();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(state.puts).toEqual([]);
  });
});

describe("EditTenderProjectDialog — controlled by the parent", () => {
  it("has no trigger of its own and opens from the open prop", async () => {
    serve();
    renderWithQueryClient(<ControlledHarness onOpenChange={vi.fn()} />);

    expect(await screen.findByRole("dialog", { name: TITLE })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "แก้ไขโครงการ" })).not.toBeInTheDocument();
    expect(textbox("ชื่อโครงการ")).toHaveValue("จัดซื้อครุภัณฑ์คอมพิวเตอร์");
  });

  it("asks the parent to close after a successful save", async () => {
    serve();
    const onOpenChange = vi.fn();
    renderWithQueryClient(<ControlledHarness onOpenChange={onOpenChange} />);
    const user = userEvent.setup();
    await screen.findByRole("dialog", { name: TITLE });

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกการแก้ไขสำเร็จ"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("asks the parent to close when cancelled", async () => {
    serve();
    const onOpenChange = vi.fn();
    renderWithQueryClient(<ControlledHarness onOpenChange={onOpenChange} />);
    const user = userEvent.setup();
    await screen.findByRole("dialog", { name: TITLE });

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
