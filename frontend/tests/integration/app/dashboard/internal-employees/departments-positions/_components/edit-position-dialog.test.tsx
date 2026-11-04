import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import EditPositionDialog from "@/app/dashboard/internal-employees/departments-positions/_components/edit-position-dialog";
import { usePositionList } from "@/lib/internal-profiles/queries/usePositionList";
import { makePosition } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/positions");
const ITEM_URL = apiUrl("/api/v1/dashboard/positions/:id");
const FALLBACK = "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

// เหมือน position-tab: แถวจาก list แต่ละแถวมีปุ่มแก้ไข — หลังบันทึก list ถูกโหลดใหม่และชื่อใหม่ต้องขึ้นแทน
function Rows() {
  const { data } = usePositionList();
  return (
    <ul>
      {data?.map((d) => (
        <li key={d.id}>
          <span>{d.name}</span>
          <EditPositionDialog position={d} />
        </li>
      ))}
    </ul>
  );
}

function serve() {
  let current = makePosition({ id: 7, name: "ผู้จัดการ" });
  const patches: { id: unknown; body: unknown }[] = [];
  let listCalls = 0;
  server.use(
    http.get(LIST_URL, () => {
      listCalls += 1;
      return HttpResponse.json({ data: [current] });
    }),
    http.patch(ITEM_URL, async ({ params, request }) => {
      const body = (await request.json()) as { name: string };
      patches.push({ id: params.id, body });
      current = { ...current, name: body.name };
      return HttpResponse.json({ data: current });
    }),
  );
  return { patches, listCalls: () => listCalls };
}

async function renderRow() {
  const rendered = renderWithQueryClient(<Rows />);
  await screen.findByText("ผู้จัดการ");
  return { ...rendered, user: userEvent.setup() };
}

const trigger = () => screen.getByRole("button", { name: "แก้ไขตำแหน่ง" });
const nameInput = () => screen.getByRole("textbox");
const submit = () => screen.getByRole("button", { name: "บันทึกการแก้ไข" });

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.findByRole("dialog", { name: "แก้ไขตำแหน่ง" });
}

async function replaceName(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.clear(nameInput());
  if (value) await user.type(nameInput(), value);
}

describe("EditPositionDialog — opening", () => {
  it("shows only the trigger while closed", async () => {
    serve();
    await renderRow();

    expect(trigger()).toBeEnabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens with the current name filled in", async () => {
    serve();
    const { user } = await renderRow();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ชื่อตำแหน่ง");
    expect(nameInput()).toHaveValue("ผู้จัดการ");
    expect(submit()).toBeEnabled();
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
  });
});

describe("EditPositionDialog — validation", () => {
  it("requires a name and sends no request", async () => {
    const { patches } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await replaceName(user, "");
    await user.click(submit());

    expect(await screen.findByText("กรุณากรอกชื่อตำแหน่ง")).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
    expect(patches).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("EditPositionDialog — submitting", () => {
  it("patches the position by id, toasts, closes and refetches the list", async () => {
    const { patches, listCalls } = serve();
    const { user } = await renderRow();
    expect(listCalls()).toBe(1);
    await openDialog(user);

    await replaceName(user, "ผู้อำนวยการ");
    await user.click(submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลสำเร็จ"));
    expect(patches).toEqual([{ id: "7", body: { name: "ผู้อำนวยการ" } }]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("ผู้อำนวยการ")).toBeInTheDocument();
    expect(listCalls()).toBe(2);
  });

  it("shows the saved name when reopened", async () => {
    serve();
    const { user } = await renderRow();
    await openDialog(user);
    await replaceName(user, "ผู้อำนวยการ");
    await user.click(submit());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await screen.findByText("ผู้อำนวยการ");

    await openDialog(user);

    expect(nameInput()).toHaveValue("ผู้อำนวยการ");
  });

  it("disables the submit button and sends one request while pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [makePosition({ id: 7, name: "ผู้จัดการ" })] })),
      http.patch(ITEM_URL, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return HttpResponse.json({ data: makePosition({ id: 7, name: "ผู้อำนวยการ" }) });
      }),
    );
    const { user } = await renderRow();
    await openDialog(user);
    await replaceName(user, "ผู้อำนวยการ");

    await user.click(submit());

    await waitFor(() => expect(submit()).toBeDisabled());
    await user.click(submit());
    expect(bodies).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลสำเร็จ"));
    expect(bodies).toHaveLength(1);
  });
});

describe("EditPositionDialog — failures", () => {
  function serveFailure(respond: () => Response) {
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [makePosition({ id: 7, name: "ผู้จัดการ" })] })),
      http.patch(ITEM_URL, respond),
    );
  }

  it("on a 422 toasts a check-the-form message and keeps the dialog open with the typed name", async () => {
    serveFailure(() =>
      HttpResponse.json({ message: "invalid", errors: { name: ["ชื่อตำแหน่งนี้มีอยู่แล้ว"] } }, { status: 422 }),
    );
    const { user } = await renderRow();
    await openDialog(user);
    await replaceName(user, "เจ้าหน้าที่");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(nameInput()).toHaveValue("เจ้าหน้าที่");
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it("shows a 422 duplicate name on the name field", async () => {
    serveFailure(() =>
      HttpResponse.json({ message: "invalid", errors: { name: ["ชื่อตำแหน่งนี้มีอยู่แล้ว"] } }, { status: 422 }),
    );
    const { user } = await renderRow();
    await openDialog(user);
    await replaceName(user, "เจ้าหน้าที่");

    await user.click(submit());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน dialog แปลว่าแสดงที่ช่องแล้ว
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("ชื่อตำแหน่งนี้มีอยู่แล้ว")).toBeInTheDocument();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("toasts the backend message of a non-422 error", async () => {
    serveFailure(() => HttpResponse.json({ message: "ไม่พบตำแหน่งนี้แล้ว" }, { status: 404 }));
    const { user } = await renderRow();
    await openDialog(user);
    await replaceName(user, "ผู้อำนวยการ");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่พบตำแหน่งนี้แล้ว"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    serveFailure(() => new HttpResponse(null, { status: 500 }));
    const { user } = await renderRow();
    await openDialog(user);
    await replaceName(user, "ผู้อำนวยการ");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the generic text on a network error", async () => {
    serveFailure(() => HttpResponse.error());
    const { user } = await renderRow();
    await openDialog(user);
    await replaceName(user, "ผู้อำนวยการ");

    await user.click(submit());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("EditPositionDialog — cancelling", () => {
  it("closes from the cancel button, sends nothing and restores the original name", async () => {
    const { patches } = serve();
    const { user } = await renderRow();
    await openDialog(user);
    await replaceName(user, "แก้ค้างไว้");

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(patches).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    await openDialog(user);
    expect(nameInput()).toHaveValue("ผู้จัดการ");
  });

  it("closes on Escape without a request", async () => {
    const { patches } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(patches).toEqual([]);
  });

  it("clears the validation error when cancelled and reopened", async () => {
    serve();
    const { user } = await renderRow();
    await openDialog(user);
    await replaceName(user, "");
    await user.click(submit());
    await screen.findByText("กรุณากรอกชื่อตำแหน่ง");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await openDialog(user);

    expect(screen.queryByText("กรุณากรอกชื่อตำแหน่ง")).not.toBeInTheDocument();
    expect(nameInput()).toHaveValue("ผู้จัดการ");
  });
});
