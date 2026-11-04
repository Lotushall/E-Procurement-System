import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import DeletePositionDialog from "@/app/dashboard/internal-employees/departments-positions/_components/delete-position-dialog";
import { usePositionList } from "@/lib/internal-profiles/queries/usePositionList";
import { makePosition } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/positions");
const ITEM_URL = apiUrl("/api/v1/dashboard/positions/:id");
const FALLBACK = "ลบตำแหน่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

// แถวจาก list แต่ละแถวมีปุ่มลบ — หลังลบสำเร็จ list ต้องโหลดใหม่และแถวหายไป
function Rows() {
  const { data } = usePositionList();
  return (
    <ul>
      {data?.map((d) => (
        <li key={d.id}>
          <span>{d.name}</span>
          <DeletePositionDialog position={d} />
        </li>
      ))}
    </ul>
  );
}

function serve({ removeOnDelete = false } = {}) {
  let rows = [makePosition({ id: 7, name: "ผู้จัดการ" })];
  const ids: unknown[] = [];
  let listCalls = 0;
  server.use(
    http.get(LIST_URL, () => {
      listCalls += 1;
      return HttpResponse.json({ data: rows });
    }),
    http.delete(ITEM_URL, ({ params }) => {
      ids.push(params.id);
      if (removeOnDelete) rows = [];
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { ids, listCalls: () => listCalls };
}

async function renderRow() {
  const rendered = renderWithQueryClient(<Rows />);
  await screen.findByText("ผู้จัดการ");
  return { ...rendered, user: userEvent.setup() };
}

const trigger = () => screen.getByRole("button", { name: "ลบตำแหน่ง" });
const confirmButton = () => screen.findByRole("button", { name: "ลบตำแหน่ง" });

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.findByRole("alertdialog");
}

describe("DeletePositionDialog — opening", () => {
  it("shows only the trigger while closed", async () => {
    serve();
    await renderRow();

    expect(trigger()).toBeEnabled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation with the position name", async () => {
    serve();
    const { user } = await renderRow();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ลบตำแหน่ง");
    expect(dialog).toHaveTextContent('ต้องการลบตำแหน่ง "ผู้จัดการ" ใช่หรือไม่?');
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
  });
});

describe("DeletePositionDialog — confirming", () => {
  it("deletes by id, toasts and closes the dialog", async () => {
    const { ids } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบตำแหน่งสำเร็จ"));
    expect(ids).toEqual(["7"]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("refetches the list after the delete so the row disappears", async () => {
    const { ids, listCalls } = serve({ removeOnDelete: true });
    const { user } = await renderRow();
    expect(listCalls()).toBe(1);
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(screen.queryByText("ผู้จัดการ")).not.toBeInTheDocument());
    expect(ids).toEqual(["7"]);
    expect(listCalls()).toBe(2);
  });

  it("disables the confirm button and sends one request while the delete is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ids: unknown[] = [];
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [makePosition({ id: 7, name: "ผู้จัดการ" })] })),
      http.delete(ITEM_URL, async ({ params }) => {
        ids.push(params.id);
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(screen.getByRole("button", { name: "ลบตำแหน่ง" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "ลบตำแหน่ง" }));
    expect(ids).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบตำแหน่งสำเร็จ"));
    expect(ids).toHaveLength(1);
  });
});

describe("DeletePositionDialog — failures", () => {
  function serveFailure(respond: () => Response) {
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [makePosition({ id: 7, name: "ผู้จัดการ" })] })),
      http.delete(ITEM_URL, respond),
    );
  }

  it("shows the backend message and keeps the dialog open", async () => {
    serveFailure(() => HttpResponse.json({ message: "ลบไม่ได้ เพราะยังมีพนักงานในตำแหน่งนี้" }, { status: 422 }));
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบไม่ได้ เพราะยังมีพนักงานในตำแหน่งนี้"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "ลบตำแหน่ง" })).toBeEnabled());
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    serveFailure(() => new HttpResponse(null, { status: 500 }));
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to the generic text on a network error", async () => {
    serveFailure(() => HttpResponse.error());
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("DeletePositionDialog — cancelling", () => {
  it("closes from the cancel button without sending a request", async () => {
    const { ids } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(ids).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByText("ผู้จัดการ")).toBeInTheDocument();
  });

  it("closes on Escape without sending a request", async () => {
    const { ids } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(ids).toEqual([]);
  });
});
