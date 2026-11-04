import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import DeleteContactDialog from "@/app/(public)/profiles/contract/_components/delete-contact-dialog";
import { makeVendorContact } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DELETE_URL = apiUrl("/api/v1/vendor/contact/:id");

function renderDialog(disabledReason?: string) {
  renderWithQueryClient(
    <DeleteContactDialog contact={makeVendorContact({ id: 9, contactName: "สมศรี" })} disabledReason={disabledReason} />,
  );
  return userEvent.setup();
}

async function confirmDelete(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "ลบผู้ติดต่อ" }));
  const dialog = await screen.findByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name: "ลบผู้ติดต่อ" }));
}

describe("DeleteContactDialog", () => {
  it("asks for confirmation with the contact name", async () => {
    const user = renderDialog();

    await user.click(screen.getByRole("button", { name: "ลบผู้ติดต่อ" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("ลบผู้ติดต่อ");
    expect(dialog).toHaveTextContent('ต้องการลบผู้ติดต่อ "สมศรี" ใช่หรือไม่?');
  });

  it("deletes the contact, toasts and closes", async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(DELETE_URL, ({ params }) => {
        deleted(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = renderDialog();

    await confirmDelete(user);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบข้อมูลผู้ติดต่อสำเร็จ"));
    expect(deleted).toHaveBeenCalledWith("9");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("does not delete when cancelled", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.delete(DELETE_URL, spy));
    const user = renderDialog();

    await user.click(screen.getByRole("button", { name: "ลบผู้ติดต่อ" }));
    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows the backend message and stays open when deleting fails", async () => {
    server.use(http.delete(DELETE_URL, () => HttpResponse.json({ message: "ลบผู้ติดต่อหลักไม่ได้" }, { status: 422 })));
    const user = renderDialog();

    await confirmDelete(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบผู้ติดต่อหลักไม่ได้"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to a generic message when the backend sends none", async () => {
    server.use(http.delete(DELETE_URL, () => new HttpResponse(null, { status: 500 })));
    const user = renderDialog();

    await confirmDelete(user);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("ลบข้อมูลผู้ติดต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    );
  });

  it("disables the confirm button while the request is pending", async () => {
    server.use(http.delete(DELETE_URL, () => new Promise(() => {})));
    const user = renderDialog();

    await confirmDelete(user);

    await waitFor(() =>
      expect(within(screen.getByRole("alertdialog")).getByRole("button", { name: "ลบผู้ติดต่อ" })).toBeDisabled(),
    );
  });

  it("disables the trigger and explains why when a disabled reason is given", async () => {
    const user = renderDialog("ไม่สามารถลบผู้ติดต่อหลักได้");

    const trigger = screen.getByRole("button", { name: "ลบผู้ติดต่อ" });
    expect(trigger).toBeDisabled();

    await user.tab();
    expect(trigger.parentElement).toHaveFocus();
    expect(await screen.findByText("ไม่สามารถลบผู้ติดต่อหลักได้")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("leaves the trigger enabled and shows no tooltip when there is no disabled reason", async () => {
    const user = renderDialog();
    const trigger = screen.getByRole("button", { name: "ลบผู้ติดต่อ" });
    expect(trigger).toBeEnabled();

    await user.hover(trigger);
    await user.tab();

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(screen.queryByText("ไม่สามารถลบผู้ติดต่อหลักได้")).not.toBeInTheDocument();
  });
});
