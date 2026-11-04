import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import DeleteDepartmentDialog from "@/app/dashboard/internal-employees/departments-positions/_components/delete-department-dialog";
import { useDepartmentList } from "@/lib/internal-profiles/queries/useDepartmentList";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/departments");
const ITEM_URL = apiUrl("/api/v1/dashboard/departments/:id");
const FALLBACK = "ลบแผนกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

// แถวจาก list แต่ละแถวมีปุ่มลบ — หลังลบสำเร็จ list ต้องโหลดใหม่และแถวหายไป
function Rows() {
  const { data } = useDepartmentList();
  return (
    <ul>
      {data?.map((d) => (
        <li key={d.id}>
          <span>{d.name}</span>
          <DeleteDepartmentDialog department={d} />
        </li>
      ))}
    </ul>
  );
}

function serve({ removeOnDelete = false } = {}) {
  let rows = [makeDepartment({ id: 7, name: "จัดซื้อ" })];
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
  await screen.findByText("จัดซื้อ");
  return { ...rendered, user: userEvent.setup() };
}

const trigger = () => screen.getByRole("button", { name: "ลบแผนก" });
const confirmButton = () => screen.findByRole("button", { name: "ลบแผนก" });

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.findByRole("alertdialog");
}

describe("DeleteDepartmentDialog — opening", () => {
  it("shows only the trigger while closed", async () => {
    serve();
    await renderRow();

    expect(trigger()).toBeEnabled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation with the department name", async () => {
    serve();
    const { user } = await renderRow();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ลบแผนก");
    expect(dialog).toHaveTextContent('ต้องการลบแผนก "จัดซื้อ" ใช่หรือไม่?');
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
  });
});

describe("DeleteDepartmentDialog — confirming", () => {
  it("deletes by id, toasts and closes the dialog", async () => {
    const { ids } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบแผนกสำเร็จ"));
    expect(ids).toEqual(["7"]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("refetches the list after the delete so the row disappears", async () => {
    const { ids, listCalls } = serve({ removeOnDelete: true });
    const { user } = await renderRow();
    expect(listCalls()).toBe(1);
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(screen.queryByText("จัดซื้อ")).not.toBeInTheDocument());
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
      http.get(LIST_URL, () => HttpResponse.json({ data: [makeDepartment({ id: 7, name: "จัดซื้อ" })] })),
      http.delete(ITEM_URL, async ({ params }) => {
        ids.push(params.id);
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(screen.getByRole("button", { name: "ลบแผนก" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "ลบแผนก" }));
    expect(ids).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบแผนกสำเร็จ"));
    expect(ids).toHaveLength(1);
  });
});

describe("DeleteDepartmentDialog — failures", () => {
  function serveFailure(respond: () => Response) {
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [makeDepartment({ id: 7, name: "จัดซื้อ" })] })),
      http.delete(ITEM_URL, respond),
    );
  }

  it("shows the backend message and keeps the dialog open", async () => {
    serveFailure(() => HttpResponse.json({ message: "ลบไม่ได้ เพราะยังมีพนักงานในแผนกนี้" }, { status: 422 }));
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบไม่ได้ เพราะยังมีพนักงานในแผนกนี้"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "ลบแผนก" })).toBeEnabled());
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

describe("DeleteDepartmentDialog — cancelling", () => {
  it("closes from the cancel button without sending a request", async () => {
    const { ids } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(ids).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByText("จัดซื้อ")).toBeInTheDocument();
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
