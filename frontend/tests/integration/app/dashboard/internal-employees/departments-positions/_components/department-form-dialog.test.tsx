import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import DepartmentFormDialog from "@/app/dashboard/internal-employees/departments-positions/_components/department-form-dialog";
import { useDepartmentList } from "@/lib/internal-profiles/queries/useDepartmentList";
import type { Department } from "@/lib/internal-profiles/types";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/departments");
const FALLBACK = "สร้างแผนกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

// ตัวแทนรายการที่อยู่ข้างปุ่มสร้างในหน้าจริง — ใช้ดูว่าหลังสร้างสำเร็จ list ถูกโหลดใหม่
function ListProbe() {
  const { data } = useDepartmentList();
  return <ul aria-label="รายการ">{data?.map((d) => <li key={d.id}>{d.name}</li>)}</ul>;
}

function serve(initial: Department[] = [makeDepartment({ id: 1, name: "จัดซื้อ" })]) {
  const list = [...initial];
  const bodies: unknown[] = [];
  let listCalls = 0;
  server.use(
    http.get(URL_, () => {
      listCalls += 1;
      return HttpResponse.json({ data: list });
    }),
    http.post(URL_, async ({ request }) => {
      const body = (await request.json()) as { name: string };
      bodies.push(body);
      const created = makeDepartment({ id: 99, name: body.name });
      list.push(created);
      return HttpResponse.json({ data: created }, { status: 201 });
    }),
  );
  return { bodies, listCalls: () => listCalls };
}

function renderDialog() {
  const rendered = renderWithQueryClient(
    <>
      <DepartmentFormDialog />
      <ListProbe />
    </>,
  );
  return { ...rendered, user: userEvent.setup() };
}

const trigger = () => screen.getByRole("button", { name: "เพิ่มแผนก" });
const nameInput = () => screen.getByRole("textbox");
const submit = () => screen.getByRole("button", { name: "สร้างแผนก" });

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.findByRole("dialog", { name: "สร้างแผนก" });
}

describe("DepartmentFormDialog — opening", () => {
  it("shows only the trigger while closed", () => {
    serve();
    renderDialog();

    expect(trigger()).toBeEnabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens with an empty name field and the submit and cancel buttons", async () => {
    serve();
    const { user } = renderDialog();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ชื่อแผนก");
    expect(nameInput()).toHaveValue("");
    expect(submit()).toBeEnabled();
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
  });
});

describe("DepartmentFormDialog — validation", () => {
  it("requires a name and sends no request", async () => {
    const { bodies } = serve();
    const { user } = renderDialog();
    await openDialog(user);

    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกชื่อแผนก")).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
    expect(bodies).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clears the error once a name is typed and submitted", async () => {
    const { bodies } = serve();
    const { user } = renderDialog();
    await openDialog(user);
    await user.click(submit());
    await screen.findByText("กรุณากรอกชื่อแผนก");

    await user.type(nameInput(), "การเงิน");
    await user.click(submit());

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(screen.queryByText("กรุณากรอกชื่อแผนก")).not.toBeInTheDocument();
  });
});

describe("DepartmentFormDialog — submitting", () => {
  it("posts the name, toasts, closes and refetches the list", async () => {
    const { bodies, listCalls } = serve();
    const { user } = renderDialog();
    await screen.findByText("จัดซื้อ");
    expect(listCalls()).toBe(1);
    await openDialog(user);

    await user.type(nameInput(), "การเงิน");
    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้างแผนกสำเร็จ"));
    expect(bodies).toEqual([{ name: "การเงิน" }]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("การเงิน")).toBeInTheDocument();
    expect(listCalls()).toBe(2);
  });

  it("starts empty when reopened after a successful create", async () => {
    serve();
    const { user } = renderDialog();
    await openDialog(user);
    await user.type(nameInput(), "การเงิน");
    await user.click(submit());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await openDialog(user);

    expect(nameInput()).toHaveValue("");
  });

  it("disables the submit button and sends one request while pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    server.use(
      http.get(URL_, () => HttpResponse.json({ data: [] })),
      http.post(URL_, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return HttpResponse.json({ data: makeDepartment({ id: 99, name: "การเงิน" }) }, { status: 201 });
      }),
    );
    const { user } = renderDialog();
    await openDialog(user);
    await user.type(nameInput(), "การเงิน");

    await user.click(submit());

    await waitFor(() => expect(submit()).toBeDisabled());
    await user.click(submit());
    expect(bodies).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้างแผนกสำเร็จ"));
    expect(bodies).toHaveLength(1);
  });
});

describe("DepartmentFormDialog — failures", () => {
  it("on a 422 toasts a check-the-form message and keeps the dialog open with the typed name", async () => {
    server.use(
      http.get(URL_, () => HttpResponse.json({ data: [] })),
      http.post(URL_, () =>
        HttpResponse.json(
          { message: "invalid", errors: { name: ["ชื่อแผนกนี้มีอยู่แล้ว", "อีกข้อความ"] } },
          { status: 422 },
        ),
      ),
    );
    const { user } = renderDialog();
    await openDialog(user);
    await user.type(nameInput(), "จัดซื้อ");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(nameInput()).toHaveValue("จัดซื้อ");
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it("shows a 422 duplicate name on the name field", async () => {
    server.use(
      http.get(URL_, () => HttpResponse.json({ data: [] })),
      http.post(URL_, () =>
        HttpResponse.json({ message: "invalid", errors: { name: ["ชื่อแผนกนี้มีอยู่แล้ว"] } }, { status: 422 }),
      ),
    );
    const { user } = renderDialog();
    await openDialog(user);
    await user.type(nameInput(), "จัดซื้อ");

    await user.click(submit());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน dialog แปลว่าแสดงที่ช่องแล้ว
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("ชื่อแผนกนี้มีอยู่แล้ว")).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("toasts the backend message of a non-422 error", async () => {
    server.use(
      http.get(URL_, () => HttpResponse.json({ data: [] })),
      http.post(URL_, () => HttpResponse.json({ message: "ไม่มีสิทธิ์สร้างแผนก" }, { status: 403 })),
    );
    const { user } = renderDialog();
    await openDialog(user);
    await user.type(nameInput(), "การเงิน");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่มีสิทธิ์สร้างแผนก"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    server.use(
      http.get(URL_, () => HttpResponse.json({ data: [] })),
      http.post(URL_, () => new HttpResponse(null, { status: 500 })),
    );
    const { user } = renderDialog();
    await openDialog(user);
    await user.type(nameInput(), "การเงิน");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text on a 422 without field errors or message", async () => {
    server.use(
      http.get(URL_, () => HttpResponse.json({ data: [] })),
      http.post(URL_, () => HttpResponse.json({ errors: {} }, { status: 422 })),
    );
    const { user } = renderDialog();
    await openDialog(user);
    await user.type(nameInput(), "การเงิน");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text on a network error", async () => {
    server.use(
      http.get(URL_, () => HttpResponse.json({ data: [] })),
      http.post(URL_, () => HttpResponse.error()),
    );
    const { user } = renderDialog();
    await openDialog(user);
    await user.type(nameInput(), "การเงิน");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("DepartmentFormDialog — cancelling", () => {
  it("closes from the cancel button, sends nothing and clears the typed name", async () => {
    const { bodies } = serve();
    const { user } = renderDialog();
    await openDialog(user);
    await user.type(nameInput(), "ค้างไว้");

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(bodies).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    await openDialog(user);
    expect(nameInput()).toHaveValue("");
  });

  it("closes on Escape without a request", async () => {
    const { bodies } = serve();
    const { user } = renderDialog();
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(bodies).toEqual([]);
  });

  it("clears the validation error when cancelled and reopened", async () => {
    serve();
    const { user } = renderDialog();
    await openDialog(user);
    await user.click(submit());
    await screen.findByText("กรุณากรอกชื่อแผนก");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openDialog(user);

    expect(screen.queryByText("กรุณากรอกชื่อแผนก")).not.toBeInTheDocument();
  });
});
