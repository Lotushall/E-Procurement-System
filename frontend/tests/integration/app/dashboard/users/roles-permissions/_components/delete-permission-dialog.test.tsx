import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { DeletePermissionDialog } from "@/app/dashboard/users/roles-permissions/_components/delete-permission-dialog";
import { usePermissions } from "@/lib/user/management/queries/usePermissions";
import { makePermission } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/permissions");
const ITEM_URL = apiUrl("/api/v1/dashboard/permissions/:name");
const FALLBACK = "ลบ permission ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const PERMISSION = makePermission({ name: "reports.exportAll", label: "ส่งออกรายงาน", group: "reports" });

function Rows() {
  const { data } = usePermissions();
  return (
    <ul>
      {data?.map((p) => (
        <li key={p.name}>
          <span>{p.label}</span>
          <DeletePermissionDialog permission={p} />
        </li>
      ))}
    </ul>
  );
}

function serve({ removeOnDelete = false } = {}) {
  let rows = [PERMISSION];
  const names: unknown[] = [];
  let listCalls = 0;
  server.use(
    http.get(LIST_URL, () => {
      listCalls += 1;
      return HttpResponse.json({ data: rows });
    }),
    http.delete(ITEM_URL, ({ params }) => {
      names.push(params.name);
      if (removeOnDelete) rows = [];
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { names, listCalls: () => listCalls };
}

async function renderRow() {
  const rendered = renderWithQueryClient(<Rows />);
  await screen.findByText("ส่งออกรายงาน");
  return { ...rendered, user: userEvent.setup() };
}

const trigger = () => screen.getByRole("button", { name: "ลบ permission" });
const confirmButton = () => screen.findByRole("button", { name: "ลบ permission" });

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.findByRole("alertdialog");
}

describe("DeletePermissionDialog — opening", () => {
  it("shows only the trigger while closed", async () => {
    serve();
    await renderRow();

    expect(trigger()).toBeEnabled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation with the permission name and warns it will be detached from roles", async () => {
    serve();
    const { user } = await renderRow();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ลบ permission");
    expect(dialog).toHaveTextContent('ต้องการลบ permission "reports.exportAll" ใช่หรือไม่?');
    expect(dialog).toHaveTextContent("หากมี role ที่ใช้ permission นี้อยู่ จะถูกถอดออกจากทุก role โดยอัตโนมัติ");
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
  });
});

describe("DeletePermissionDialog — confirming", () => {
  it("deletes by name, toasts and closes the dialog", async () => {
    const { names } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบ permission สำเร็จ"));
    expect(names).toEqual(["reports.exportAll"]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("refetches the list after the delete so the row disappears", async () => {
    const { names, listCalls } = serve({ removeOnDelete: true });
    const { user } = await renderRow();
    expect(listCalls()).toBe(1);
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(screen.queryByText("ส่งออกรายงาน")).not.toBeInTheDocument());
    expect(names).toEqual(["reports.exportAll"]);
    expect(listCalls()).toBe(2);
  });

  it("disables the confirm button and sends one request while the delete is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const names: unknown[] = [];
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [PERMISSION] })),
      http.delete(ITEM_URL, async ({ params }) => {
        names.push(params.name);
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(screen.getByRole("button", { name: "ลบ permission" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "ลบ permission" }));
    expect(names).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบ permission สำเร็จ"));
    expect(names).toHaveLength(1);
  });
});

describe("DeletePermissionDialog — failures", () => {
  function serveFailure(respond: () => Response) {
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [PERMISSION] })),
      http.delete(ITEM_URL, respond),
    );
  }

  it("shows the backend message and keeps the dialog open", async () => {
    serveFailure(() => HttpResponse.json({ message: "ลบ permission ระบบไม่ได้" }, { status: 403 }));
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบ permission ระบบไม่ได้"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "ลบ permission" })).toBeEnabled());
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

describe("DeletePermissionDialog — cancelling", () => {
  it("closes from the cancel button without sending a request", async () => {
    const { names } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(names).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByText("ส่งออกรายงาน")).toBeInTheDocument();
  });

  it("closes on Escape without sending a request", async () => {
    const { names } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(names).toEqual([]);
  });
});
