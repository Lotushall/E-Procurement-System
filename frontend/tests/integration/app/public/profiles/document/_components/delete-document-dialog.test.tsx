import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import DeleteDocumentDialog from "@/app/(public)/profiles/document/_components/delete-document-dialog";
import { makeVendorDocument } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DELETE_URL = apiUrl("/api/v1/vendor/document/:id");

function renderDialog() {
  renderWithQueryClient(<DeleteDocumentDialog document={makeVendorDocument({ id: 11, fileName: "certificate.pdf" })} />);
  return userEvent.setup();
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "ลบไฟล์" }));
  return screen.findByRole("alertdialog");
}

describe("DeleteDocumentDialog", () => {
  it("asks for confirmation with the file name", async () => {
    const user = renderDialog();

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ลบเอกสาร");
    expect(dialog).toHaveTextContent('ต้องการลบเอกสาร "certificate.pdf" ใช่หรือไม่?');
  });

  it("deletes the document, toasts and closes", async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(DELETE_URL, ({ params }) => {
        deleted(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = renderDialog();

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "ลบเอกสาร" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบเอกสารสำเร็จ"));
    expect(deleted).toHaveBeenCalledWith("11");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("does not delete when cancelled", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.delete(DELETE_URL, spy));
    const user = renderDialog();

    await openDialog(user);
    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows the backend message and stays open when deleting fails", async () => {
    server.use(http.delete(DELETE_URL, () => HttpResponse.json({ message: "เอกสารถูกอนุมัติแล้ว ลบไม่ได้" }, { status: 422 })));
    const user = renderDialog();

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "ลบเอกสาร" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เอกสารถูกอนุมัติแล้ว ลบไม่ได้"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to a generic message when the backend sends none", async () => {
    server.use(http.delete(DELETE_URL, () => new HttpResponse(null, { status: 500 })));
    const user = renderDialog();

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "ลบเอกสาร" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  });

  it("disables the confirm button while the request is pending", async () => {
    server.use(http.delete(DELETE_URL, () => new Promise(() => {})));
    const user = renderDialog();

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "ลบเอกสาร" }));

    await waitFor(() =>
      expect(within(screen.getByRole("alertdialog")).getByRole("button", { name: "ลบเอกสาร" })).toBeDisabled(),
    );
  });
});
