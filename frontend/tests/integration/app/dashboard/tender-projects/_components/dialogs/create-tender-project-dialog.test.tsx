import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { useState } from "react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { CreateTenderProjectDialog } from "@/app/dashboard/tender-projects/_components/dialogs/create-tender-project-dialog";
import { PROCUREMENT_METHODS } from "@/lib/tender/procurement-methods";
import { makeDepartment, makeInternalProfileOption } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { apiUrl, server } from "@/tests/msw/server";

// ปีงบประมาณและค่าเริ่มต้นของฟอร์มคำนวณตอน import module — ต้องล็อกเวลาก่อน import ทั้งหมด
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T10:00:00+07:00"));
});
freezeTimeAt("2026-11-02T10:00:00+07:00");

const CREATE_URL = apiUrl("/api/v1/dashboard/tender-projects");
const DEPARTMENTS_URL = apiUrl("/api/v1/dashboard/departments/select");
const PROFILES_URL = apiUrl("/api/v1/dashboard/internal-profiles/select");
const FALLBACK = "สร้างโครงการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const PROFILES = [
  makeInternalProfileOption({ id: 7, name: "สมหญิง รักงาน" }),
  makeInternalProfileOption({ id: 8, name: "สมศักดิ์ ทำดี" }),
];

function serve() {
  const state = { posts: [] as unknown[] };
  server.use(
    http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: DEPARTMENTS })),
    http.get(PROFILES_URL, () => HttpResponse.json({ data: PROFILES })),
    http.post(CREATE_URL, async ({ request }) => {
      state.posts.push(await request.json());
      return HttpResponse.json({ data: { projectCode: "TP-2570-001" } }, { status: 201 });
    }),
  );
  return state;
}

function Harness({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        เปิดฟอร์ม
      </button>
      <CreateTenderProjectDialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          setOpen(next);
        }}
      />
    </>
  );
}

async function setup() {
  const onOpenChange = vi.fn();
  const rendered = renderWithQueryClient(<Harness onOpenChange={onOpenChange} />);
  await screen.findByRole("dialog", { name: "สร้างโครงการจัดซื้อจัดจ้างใหม่" });
  return { ...rendered, onOpenChange, user: userEvent.setup() };
}

type User = ReturnType<typeof userEvent.setup>;

function fieldGroup(label: string): HTMLElement {
  const group = screen.getByText(label).closest("div.flex-col");
  if (!group) throw new Error(`field group not found for ${label}`);
  return group as HTMLElement;
}
const textbox = (label: string) => within(fieldGroup(label)).getByRole("textbox");
const combo = (label: string) => within(fieldGroup(label)).getByRole("combobox");
const submit = () => screen.getByRole("button", { name: "สร้างโครงการ" });

async function pickOption(user: User, label: string, option: string) {
  await user.click(combo(label));
  await user.click(await screen.findByRole("option", { name: option }));
}

const NOV_15 = "วันอาทิตย์ที่ 15 พฤศจิกายน 2026";
const NOV_20 = "วันศุกร์ที่ 20 พฤศจิกายน 2026";

async function pickDates(user: User, ...days: string[]) {
  await user.click(screen.getByRole("button", { name: /เลือกระยะเวลาโครงการ|ถึง/ }));
  for (const day of days) {
    await user.click(await screen.findByRole("button", { name: day }));
  }
  // คลิกนอก popover เพื่อปิด (Escape จะปิดทั้ง dialog)
  await user.click(screen.getByRole("heading", { name: "สร้างโครงการจัดซื้อจัดจ้างใหม่" }));
  await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
}

async function fillRequired(user: User, budget = "1500000.5", days = [NOV_15, NOV_20]) {
  await user.type(textbox("ชื่อโครงการ"), "จัดซื้อเซิร์ฟเวอร์");
  await pickOption(user, "แผนก", "บัญชี");
  await user.type(textbox("งบประมาณ"), budget);
  await pickOption(user, "วิธีจัดซื้อ", "คัดเลือก");
  await pickDates(user, ...days);
}

describe("CreateTenderProjectDialog — opening", () => {
  it("shows the empty form with the current fiscal year preselected", async () => {
    serve();
    await setup();

    expect(textbox("ชื่อโครงการ")).toHaveValue("");
    expect(combo("แผนก")).toHaveTextContent("---");
    expect(combo("ผู้รับผิดชอบ")).toHaveTextContent("---");
    expect(textbox("งบประมาณ")).toHaveValue("");
    expect(combo("ปีงบประมาณ")).toHaveTextContent("ปีงบประมาณ 2570");
    expect(screen.getByRole("button", { name: /เลือกระยะเวลาโครงการ/ })).toBeInTheDocument();
    expect(textbox("รายละเอียด")).toHaveValue("");
  });

  it("offers the next fiscal year and the four before it", async () => {
    serve();
    const { user } = await setup();

    await user.click(combo("ปีงบประมาณ"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "ปีงบประมาณ 2570",
      "ปีงบประมาณ 2569",
      "ปีงบประมาณ 2568",
      "ปีงบประมาณ 2567",
      "ปีงบประมาณ 2566",
    ]);
  });

  it("lists the departments from the server", async () => {
    serve();
    const { user } = await setup();

    await user.click(combo("แผนก"));

    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual(["---", "จัดซื้อ", "บัญชี"]);
  });

  it("lists the staff from the server as the person in charge", async () => {
    serve();
    const { user } = await setup();

    await user.click(combo("ผู้รับผิดชอบ"));

    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual([
      "---",
      "สมหญิง รักงาน",
      "สมศักดิ์ ทำดี",
    ]);
  });

  it("lists the procurement methods of the tender module", async () => {
    serve();
    const { user } = await setup();

    await user.click(combo("วิธีจัดซื้อ"));
    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual(PROCUREMENT_METHODS);
  });
});

describe("CreateTenderProjectDialog — budget input", () => {
  it("groups thousands, keeps two decimals and drops letters and extra dots", async () => {
    serve();
    const { user } = await setup();

    await user.type(textbox("งบประมาณ"), "1a234567.891.2");

    expect(textbox("งบประมาณ")).toHaveValue("1,234,567.89");
  });
});

describe("CreateTenderProjectDialog — validation", () => {
  it("requires name, department, budget, method and project period and sends no request", async () => {
    const state = serve();
    const { user } = await setup();

    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกชื่อโครงการ")).toBeInTheDocument();
    expect(screen.getByText("กรุณาเลือกแผนก")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกงบประมาณ")).toBeInTheDocument();
    expect(screen.getByText("กรุณาเลือกวิธีจัดซื้อ")).toBeInTheDocument();
    expect(screen.getByText("กรุณาเลือกระยะเวลาโครงการ")).toBeInTheDocument();
    expect(state.posts).toEqual([]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("rejects a budget of zero", async () => {
    const state = serve();
    const { user } = await setup();
    await fillRequired(user, "0");

    await user.click(submit());

    expect(await screen.findByText("งบประมาณต้องมากกว่า 0")).toBeInTheDocument();
    expect(state.posts).toEqual([]);
  });

  it("rejects a budget above the maximum", async () => {
    const state = serve();
    const { user } = await setup();
    await fillRequired(user, "1000000000000");

    await user.click(submit());

    expect(await screen.findByText("งบประมาณไม่ถูกต้อง")).toBeInTheDocument();
    expect(state.posts).toEqual([]);
  });

  it("rejects a budget that is not a number", async () => {
    const state = serve();
    const { user } = await setup();
    await fillRequired(user, ".");

    await user.click(submit());

    expect(await screen.findByText("งบประมาณไม่ถูกต้อง")).toBeInTheDocument();
    expect(state.posts).toEqual([]);
  });

  it("clears an error once the field is corrected and submitted again", async () => {
    const state = serve();
    const { user } = await setup();
    await fillRequired(user, "0");
    await user.click(submit());
    await screen.findByText("งบประมาณต้องมากกว่า 0");

    await user.clear(textbox("งบประมาณ"));
    await user.type(textbox("งบประมาณ"), "5");
    await user.click(submit());

    await waitFor(() => expect(state.posts).toHaveLength(1));
    expect(screen.queryByText("งบประมาณต้องมากกว่า 0")).not.toBeInTheDocument();
  });
});

describe("CreateTenderProjectDialog — project period", () => {
  it("writes the start and end days the user picks, shown in the trigger", async () => {
    serve();
    const { user } = await setup();

    await pickDates(user, NOV_15, NOV_20);

    expect(screen.getByRole("button", { name: /15 พ\.ย\. \d{4} ถึง 20 พ\.ย\. \d{4}/ })).toBeInTheDocument();
  });

  it("allows the start day to equal the end day", async () => {
    const state = serve();
    const { user } = await setup();
    await fillRequired(user, undefined, [NOV_15]);

    await user.click(submit());

    await waitFor(() => expect(state.posts).toHaveLength(1));
    expect(state.posts[0]).toMatchObject({ projectStartAt: "2026-11-15", projectEndAt: "2026-11-15" });
  });

  it("clears both days with the clear button", async () => {
    serve();
    const { user } = await setup();
    await pickDates(user, NOV_15, NOV_20);

    await user.click(screen.getByRole("button", { name: /ถึง/ }));
    await user.click(await screen.findByRole("button", { name: "ล้างค่า" }));

    expect(screen.getByRole("button", { name: /เลือกระยะเวลาโครงการ/ })).toBeInTheDocument();
  });
});

describe("CreateTenderProjectDialog — submitting", () => {
  it("sends only the required fields, with numbers converted, and omits the empty optional ones", async () => {
    const state = serve();
    const { user } = await setup();
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(state.posts).toHaveLength(1));
    expect(state.posts[0]).toEqual({
      name: "จัดซื้อเซิร์ฟเวอร์",
      budget: 1500000.5,
      departmentId: 2,
      procurementMethod: "คัดเลือก",
      fiscalYear: 2570,
      projectStartAt: "2026-11-15",
      projectEndAt: "2026-11-20",
    });
  });

  it("sends every field with numeric ids, the chosen fiscal year and ISO days", async () => {
    const state = serve();
    const { user } = await setup();
    await fillRequired(user);
    await pickOption(user, "ผู้รับผิดชอบ", "สมศักดิ์ ทำดี");
    await pickOption(user, "ปีงบประมาณ", "ปีงบประมาณ 2569");
    await user.type(textbox("รายละเอียด"), "รายละเอียดเพิ่มเติม");

    await user.click(submit());

    await waitFor(() => expect(state.posts).toHaveLength(1));
    expect(state.posts[0]).toEqual({
      name: "จัดซื้อเซิร์ฟเวอร์",
      description: "รายละเอียดเพิ่มเติม",
      budget: 1500000.5,
      departmentId: 2,
      personInChargeId: 8,
      procurementMethod: "คัดเลือก",
      fiscalYear: 2569,
      projectStartAt: "2026-11-15",
      projectEndAt: "2026-11-20",
    });
  });

  it("omits the person in charge when the dash option is chosen again", async () => {
    const state = serve();
    const { user } = await setup();
    await fillRequired(user);
    await pickOption(user, "ผู้รับผิดชอบ", "สมหญิง รักงาน");
    await pickOption(user, "ผู้รับผิดชอบ", "---");

    await user.click(submit());

    await waitFor(() => expect(state.posts).toHaveLength(1));
    expect(state.posts[0]).not.toHaveProperty("personInChargeId");
  });

  it("sends a procurement method typed by the user", async () => {
    const state = serve();
    const { user } = await setup();
    await user.type(textbox("ชื่อโครงการ"), "จัดซื้อ");
    await pickOption(user, "แผนก", "จัดซื้อ");
    await user.type(textbox("งบประมาณ"), "10");
    await user.click(combo("วิธีจัดซื้อ"));
    await user.type(await screen.findByPlaceholderText("ค้นหาวิธีจัดซื้อ"), "วิธีพิเศษ");
    await user.click(await screen.findByRole("option", { name: '+ เพิ่ม "วิธีพิเศษ"' }));
    await pickDates(user, NOV_15, NOV_20);

    await user.click(submit());

    await waitFor(() => expect(state.posts).toHaveLength(1));
    expect(state.posts[0]).toMatchObject({ procurementMethod: "วิธีพิเศษ" });
  });

  it("toasts the project code, closes the dialog and invalidates the project list", async () => {
    serve();
    const { user, queryClient, onOpenChange } = await setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้างโครงการสำเร็จ (TP-2570-001)"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });

  it("opens with an empty form again after a successful create", async () => {
    serve();
    const { user } = await setup();
    await fillRequired(user);
    await user.click(submit());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "เปิดฟอร์ม" }));

    await screen.findByRole("dialog");
    expect(textbox("ชื่อโครงการ")).toHaveValue("");
    expect(textbox("งบประมาณ")).toHaveValue("");
    expect(combo("แผนก")).toHaveTextContent("---");
  });

  it("disables the button and sends one request while the create is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const posts: unknown[] = [];
    serve();
    server.use(
      http.post(CREATE_URL, async ({ request }) => {
        posts.push(await request.json());
        await gate;
        return HttpResponse.json({ data: { projectCode: "TP-2570-001" } }, { status: 201 });
      }),
    );
    const { user } = await setup();
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(submit()).toBeDisabled());
    await user.click(submit());
    expect(posts).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้างโครงการสำเร็จ (TP-2570-001)"));
    expect(posts).toHaveLength(1);
  });
});

describe("CreateTenderProjectDialog — failures", () => {
  it("on a 422 toasts a check-the-form message, stays open with the input and re-enables the button", async () => {
    serve();
    server.use(
      http.post(CREATE_URL, () =>
        HttpResponse.json(
          { message: "ข้อมูลไม่ถูกต้อง", errors: { departmentId: ["ไม่พบแผนกนี้"], budget: ["งบประมาณไม่ถูกต้อง"] } },
          { status: 422 },
        ),
      ),
    );
    const { user, queryClient } = await setup();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(textbox("ชื่อโครงการ")).toHaveValue("จัดซื้อเซิร์ฟเวอร์");
    await waitFor(() => expect(submit()).toBeEnabled());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });

  it("shows a 422 on the department field the backend names", async () => {
    serve();
    server.use(
      http.post(CREATE_URL, () =>
        HttpResponse.json({ message: "ข้อมูลไม่ถูกต้อง", errors: { departmentId: ["ไม่พบแผนกนี้"] } }, { status: 422 }),
      ),
    );
    const { user } = await setup();
    await fillRequired(user);

    await user.click(submit());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน dialog แปลว่าแสดงที่ช่องแล้ว
    expect(await within(screen.getByRole("dialog")).findByText("ไม่พบแผนกนี้")).toBeInTheDocument();
  });

  it("shows a 422 on the project period when the backend names projectStartAt", async () => {
    serve();
    server.use(
      http.post(CREATE_URL, () =>
        HttpResponse.json(
          { message: "ข้อมูลไม่ถูกต้อง", errors: { projectStartAt: ["วันที่เริ่มต้นไม่ถูกต้อง"] } },
          { status: 422 },
        ),
      ),
    );
    const { user } = await setup();
    await fillRequired(user);

    await user.click(submit());

    expect(await within(screen.getByRole("dialog")).findByText("วันที่เริ่มต้นไม่ถูกต้อง")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก");
  });

  it("shows the backend message for other failures", async () => {
    serve();
    server.use(http.post(CREATE_URL, () => HttpResponse.json({ message: "ไม่มีสิทธิ์สร้างโครงการ" }, { status: 403 })));
    const { user } = await setup();
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่มีสิทธิ์สร้างโครงการ"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    serve();
    server.use(http.post(CREATE_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = await setup();
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text for a 422 with neither field errors nor a message", async () => {
    serve();
    server.use(http.post(CREATE_URL, () => HttpResponse.json({}, { status: 422 })));
    const { user } = await setup();
    await fillRequired(user);

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("CreateTenderProjectDialog — cancelling", () => {
  it("closes from the cancel button without a request and discards what was typed", async () => {
    const state = serve();
    const { user, onOpenChange } = await setup();
    await user.type(textbox("ชื่อโครงการ"), "ยังไม่บันทึก");

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "เปิดฟอร์ม" }));
    await screen.findByRole("dialog");
    expect(textbox("ชื่อโครงการ")).toHaveValue("");
    expect(state.posts).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("closes on Escape without a request", async () => {
    const state = serve();
    const { user, onOpenChange } = await setup();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(state.posts).toEqual([]);
  });
});
