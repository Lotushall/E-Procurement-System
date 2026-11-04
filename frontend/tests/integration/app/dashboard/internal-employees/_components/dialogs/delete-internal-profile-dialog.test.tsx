import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { useState } from "react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import DeleteInternalProfileDialog from "@/app/dashboard/internal-employees/_components/dialogs/delete-internal-profile-dialog";
import type { InternalProfile } from "@/lib/internal-profiles/types";
import { makeInternalProfile } from "@/tests/fixtures/internal-profiles";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DELETE_URL = apiUrl("/api/v1/dashboard/internal-profiles/:id");
const FALLBACK = "ลบพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const PROFILE = makeInternalProfile({ id: 21, userId: null, prefix: "นาย", firstname: "สมชาย", lastname: "ใจดี" });

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

function renderUncontrolled(profile: InternalProfile = PROFILE) {
  const rendered = renderWithQueryClient(<DeleteInternalProfileDialog internal_profile={profile} />);
  return { ...rendered, user: userEvent.setup() };
}

function ControlledHarness({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <DeleteInternalProfileDialog
      internal_profile={PROFILE}
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setOpen(next);
      }}
    />
  );
}

const trigger = () => screen.getByRole("button", { name: "ลบพนักงาน" });
const confirmButton = () => screen.findByRole("button", { name: "ลบพนักงาน" });

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(trigger());
  return screen.findByRole("alertdialog");
}

describe("DeleteInternalProfileDialog — opening", () => {
  it("shows only the trigger while closed", () => {
    signInAs();
    renderUncontrolled();

    expect(trigger()).toBeEnabled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation with the full name including the prefix", async () => {
    signInAs();
    const { user } = renderUncontrolled();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ลบพนักงาน");
    expect(dialog).toHaveTextContent('ต้องการลบพนักงาน "นายสมชาย ใจดี" ใช่หรือไม่?');
  });
});

describe("DeleteInternalProfileDialog — confirming", () => {
  it("deletes the profile by id, toasts and closes", async () => {
    signInAs();
    const ids = serveDelete();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบพนักงานสำเร็จ"));
    expect(ids).toEqual(["21"]);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("disables the confirm button and sends one request while the delete is pending", async () => {
    signInAs();
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

    await waitFor(() => expect(screen.getByRole("button", { name: "ลบพนักงาน" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "ลบพนักงาน" }));
    expect(ids).toHaveLength(1);

    release();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบพนักงานสำเร็จ"));
    expect(ids).toHaveLength(1);
  });
});

describe("DeleteInternalProfileDialog — failures", () => {
  it("shows the backend message", async () => {
    signInAs();
    server.use(
      http.delete(DELETE_URL, () =>
        HttpResponse.json({ message: "ลบไม่ได้ เพราะพนักงานมีบัญชีผู้ใช้" }, { status: 422 }),
      ),
    );
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบไม่ได้ เพราะพนักงานมีบัญชีผู้ใช้"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to the generic text when the backend sends no message", async () => {
    signInAs();
    server.use(http.delete(DELETE_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to the generic text on a network error", async () => {
    signInAs();
    server.use(http.delete(DELETE_URL, () => HttpResponse.error()));
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("DeleteInternalProfileDialog — cancelling", () => {
  it("closes from the cancel button without sending a request", async () => {
    signInAs();
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
    signInAs();
    const ids = serveDelete();
    const { user } = renderUncontrolled();
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(ids).toEqual([]);
  });
});

describe("DeleteInternalProfileDialog — own account", () => {
  const OWN = makeInternalProfile({ id: 22, userId: 77, firstname: "ตัวเอง" });

  it("disables the trigger with an explanation when the profile belongs to the signed-in user", async () => {
    signInAs({ id: 77 });
    const ids = serveDelete();
    const { user } = renderUncontrolled(OWN);

    await waitFor(() => expect(trigger()).toBeDisabled());
    await user.click(trigger());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await user.tab();

    expect(await screen.findByText("ไม่สามารถลบบัญชีของตัวเองได้")).toBeInTheDocument();
    expect(ids).toEqual([]);
  });

  it("keeps the trigger enabled for a profile linked to another user", async () => {
    const me = signInAs({ id: 5 });
    // ตอบ /auth/user เหมือน signInAs แต่เก็บว่าถูกเรียกแล้ว — จะได้รู้ว่าโหลด user เสร็จก่อนเช็คว่ากดได้
    const loaded = vi.fn();
    server.use(
      http.get(apiUrl("/api/v1/auth/user"), () => {
        loaded();
        return HttpResponse.json({ data: me });
      }),
    );
    const { user, queryClient } = renderUncontrolled(OWN);
    await waitFor(() => expect(loaded).toHaveBeenCalled());
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));

    expect(trigger()).toBeEnabled();
    await user.click(trigger());
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });
});

describe("DeleteInternalProfileDialog — controlled by the parent", () => {
  it("has no trigger and shows the dialog from the open prop", async () => {
    signInAs();
    renderWithQueryClient(<ControlledHarness onOpenChange={vi.fn()} />);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent('ต้องการลบพนักงาน "นายสมชาย ใจดี" ใช่หรือไม่?');
    expect(screen.getAllByRole("button", { name: "ลบพนักงาน", hidden: true })).toHaveLength(1);
  });

  it("asks the parent to close after a successful delete", async () => {
    signInAs();
    const ids = serveDelete();
    const onOpenChange = vi.fn();
    renderWithQueryClient(<ControlledHarness onOpenChange={onOpenChange} />);
    const user = userEvent.setup();

    await user.click(await confirmButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบพนักงานสำเร็จ"));
    expect(ids).toEqual(["21"]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("asks the parent to close when cancelled, without a request", async () => {
    signInAs();
    const ids = serveDelete();
    const onOpenChange = vi.fn();
    renderWithQueryClient(<ControlledHarness onOpenChange={onOpenChange} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(ids).toEqual([]);
  });
});
