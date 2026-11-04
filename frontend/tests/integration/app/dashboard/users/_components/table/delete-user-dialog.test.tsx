import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { useState } from "react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { DeleteUserDialog } from "@/app/dashboard/users/_components/table/delete-user-dialog";
import type { UserListItem } from "@/lib/user/management/types";
import { makeManagedUser } from "@/tests/fixtures/user-management";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DELETE_URL = apiUrl("/api/v1/dashboard/users/:id");
const FALLBACK = "ลบผู้ใช้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const USER = makeManagedUser({ id: 21, username: "somchai" });

function serveDelete() {
  const ids: unknown[] = [];
  server.use(
    http.delete(DELETE_URL, ({ params }) => {
      ids.push(params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return ids;
}

function renderUncontrolled(props: { user?: UserListItem; currentUserId?: number; onDeleted?: () => void } = {}) {
  const rendered = renderWithQueryClient(
    <DeleteUserDialog user={props.user ?? USER} currentUserId={props.currentUserId ?? 1000} onDeleted={props.onDeleted} />,
  );
  return { ...rendered, user: userEvent.setup() };
}

function ControlledHarness({ onOpenChange, onDeleted }: { onOpenChange: (open: boolean) => void; onDeleted?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <DeleteUserDialog
      user={USER}
      currentUserId={1000}
      onDeleted={onDeleted}
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setOpen(next);
      }}
    />
  );
}

const trigger = () => screen.getByRole("button", { name: "ลบ user" });
const confirmButton = () => screen.findByRole("button", { name: "ลบผู้ใช้" });

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.findByRole("alertdialog");
}

describe("DeleteUserDialog — opening", () => {
  it("shows only the trigger while closed", () => {
    renderUncontrolled();

    expect(trigger()).toBeEnabled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation naming the username", async () => {
    const { user } = renderUncontrolled();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ลบผู้ใช้");
    expect(dialog).toHaveTextContent('ต้องการลบผู้ใช้ "somchai" ใช่หรือไม่?');
  });
});

describe("DeleteUserDialog — confirming", () => {
  it("deletes the user by id, toasts, calls onDeleted, closes and refetches users queries", async () => {
    const ids = serveDelete();
    const onDeleted = vi.fn();
    const { user, queryClient } = renderUncontrolled({ onDeleted });
    queryClient.setQueryData(["users", "list", {}, 1, 20], []);
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ใช้สำเร็จ"));
    expect(ids).toEqual(["21"]);
    expect(onDeleted).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(queryClient.getQueryState(["users", "list", {}, 1, 20])?.isInvalidated).toBe(true);
  });

  it("works without an onDeleted callback", async () => {
    serveDelete();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ใช้สำเร็จ"));
  });

  it("disables the confirm button and sends one request while the delete is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ids: unknown[] = [];
    server.use(
      http.delete(DELETE_URL, async ({ params }) => {
        ids.push(params.id);
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(screen.getByRole("button", { name: "ลบผู้ใช้" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "ลบผู้ใช้" }));
    expect(ids).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ใช้สำเร็จ"));
    expect(ids).toHaveLength(1);
  });
});

describe("DeleteUserDialog — failures", () => {
  it("shows the backend message, stays open and does not call onDeleted", async () => {
    server.use(http.delete(DELETE_URL, () => HttpResponse.json({ message: "ลบไม่ได้ ผู้ใช้นี้มีข้อมูลเชื่อมโยง" }, { status: 422 })));
    const onDeleted = vi.fn();
    const { user } = renderUncontrolled({ onDeleted });
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบไม่ได้ ผู้ใช้นี้มีข้อมูลเชื่อมโยง"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    server.use(http.delete(DELETE_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to the generic text on a network error", async () => {
    server.use(http.delete(DELETE_URL, () => HttpResponse.error()));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("DeleteUserDialog — cancelling", () => {
  it("closes from the cancel button without sending a request", async () => {
    const ids = serveDelete();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(ids).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("closes on Escape without sending a request", async () => {
    const ids = serveDelete();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(ids).toEqual([]);
  });
});

describe("DeleteUserDialog — own account", () => {
  it("disables the trigger with an explanation when the user is the signed-in user", async () => {
    const ids = serveDelete();
    const { user } = renderUncontrolled({ currentUserId: 21 });

    expect(trigger()).toBeDisabled();
    await user.click(trigger());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await user.tab();

    expect(await screen.findByText("ไม่สามารถลบบัญชีของตัวเองได้")).toBeInTheDocument();
    expect(ids).toEqual([]);
  });

  it("keeps the trigger enabled when the signed-in user is unknown", () => {
    renderWithQueryClient(<DeleteUserDialog user={USER} currentUserId={undefined} />);

    expect(trigger()).toBeEnabled();
  });
});

describe("DeleteUserDialog — controlled by the parent", () => {
  it("has no trigger and shows the dialog from the open prop", async () => {
    renderWithQueryClient(<ControlledHarness onOpenChange={vi.fn()} />);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent('ต้องการลบผู้ใช้ "somchai" ใช่หรือไม่?');
    expect(screen.queryByRole("button", { name: "ลบ user" })).not.toBeInTheDocument();
  });

  it("asks the parent to close and calls onDeleted after a successful delete", async () => {
    const ids = serveDelete();
    const onOpenChange = vi.fn();
    const onDeleted = vi.fn();
    renderWithQueryClient(<ControlledHarness onOpenChange={onOpenChange} onDeleted={onDeleted} />);
    const user = userEvent.setup();

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ใช้สำเร็จ"));
    expect(ids).toEqual(["21"]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDeleted).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("asks the parent to close when cancelled, without a request", async () => {
    const ids = serveDelete();
    const onOpenChange = vi.fn();
    renderWithQueryClient(<ControlledHarness onOpenChange={onOpenChange} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(ids).toEqual([]);
  });

  it("stays silent when open is controlled but no onOpenChange is given", async () => {
    const ids = serveDelete();
    renderWithQueryClient(<DeleteUserDialog user={USER} currentUserId={1000} open />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    expect(ids).toEqual([]);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
