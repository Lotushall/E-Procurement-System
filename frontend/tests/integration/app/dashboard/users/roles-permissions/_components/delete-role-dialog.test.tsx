import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { DeleteRoleDialog } from "@/app/dashboard/users/roles-permissions/_components/delete-role-dialog";
import { useRoles } from "@/lib/user/management/queries/useRoles";
import type { RoleDetail } from "@/lib/user/management/types";
import { makeRole } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/roles");
const ITEM_URL = apiUrl("/api/v1/dashboard/roles/:id");
const FALLBACK = "ลบ role ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

function Rows() {
  const { data } = useRoles();
  return (
    <ul>
      {data?.map((r) => (
        <li key={r.id}>
          <span>{r.name}</span>
          <DeleteRoleDialog role={r} />
        </li>
      ))}
    </ul>
  );
}

function serve(
  initial: RoleDetail[] = [makeRole({ id: 7, name: "auditor", userCount: 0 })],
  { removeOnDelete = false } = {},
) {
  let rows = initial;
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

async function renderRow(name = "auditor") {
  const rendered = renderWithQueryClient(<Rows />);
  await screen.findByText(name);
  return { ...rendered, user: userEvent.setup() };
}

const trigger = () => screen.getByRole("button", { name: "ลบ role" });
const confirmButton = () => screen.findByRole("button", { name: "ลบ role" });

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.findByRole("alertdialog");
}

describe("DeleteRoleDialog — opening", () => {
  it("shows only the enabled trigger while closed", async () => {
    serve();
    await renderRow();

    expect(trigger()).toBeEnabled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation with the role name", async () => {
    serve();
    const { user } = await renderRow();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ลบ role");
    expect(dialog).toHaveTextContent('ต้องการลบ role "auditor" ใช่หรือไม่?');
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
  });
});

describe("DeleteRoleDialog — role still in use", () => {
  it("disables the trigger and explains with the user count on hover", async () => {
    const { ids } = serve([makeRole({ id: 7, name: "auditor", userCount: 3 })]);
    const { user } = await renderRow();

    expect(trigger()).toBeDisabled();
    await user.hover(trigger().parentElement!);

    expect(await screen.findByText("ไม่สามารถลบ role ที่ยังมีผู้ใช้งานอยู่ได้ (3 คน)")).toBeInTheDocument();
    await user.click(trigger());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(ids).toEqual([]);
  });
});

describe("DeleteRoleDialog — confirming", () => {
  it("deletes by id, toasts and closes the dialog", async () => {
    const { ids } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบ role สำเร็จ"));
    expect(ids).toEqual(["7"]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("refetches the list after the delete so the row disappears", async () => {
    const { ids, listCalls } = serve(undefined, { removeOnDelete: true });
    const { user } = await renderRow();
    expect(listCalls()).toBe(1);
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(screen.queryByText("auditor")).not.toBeInTheDocument());
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
      http.get(LIST_URL, () => HttpResponse.json({ data: [makeRole({ id: 7, name: "auditor" })] })),
      http.delete(ITEM_URL, async ({ params }) => {
        ids.push(params.id);
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(screen.getByRole("button", { name: "ลบ role" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "ลบ role" }));
    expect(ids).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบ role สำเร็จ"));
    expect(ids).toHaveLength(1);
  });
});

describe("DeleteRoleDialog — failures", () => {
  function serveFailure(respond: () => Response) {
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ data: [makeRole({ id: 7, name: "auditor" })] })),
      http.delete(ITEM_URL, respond),
    );
  }

  it("shows the backend message and keeps the dialog open", async () => {
    serveFailure(() => HttpResponse.json({ message: "ลบไม่ได้ เพราะ role นี้ถูกใช้งานอยู่" }, { status: 422 }));
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบไม่ได้ เพราะ role นี้ถูกใช้งานอยู่"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "ลบ role" })).toBeEnabled());
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

describe("DeleteRoleDialog — cancelling", () => {
  it("closes from the cancel button without sending a request", async () => {
    const { ids } = serve();
    const { user } = await renderRow();
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(ids).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByText("auditor")).toBeInTheDocument();
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
