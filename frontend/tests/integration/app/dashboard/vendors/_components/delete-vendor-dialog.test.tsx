import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeleteVendorDialog } from "@/app/dashboard/vendors/_components/delete-vendor-dialog";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DELETE_URL = apiUrl("/api/v1/vendors/:id");

function renderDialog(onSuccess = vi.fn()) {
  renderWithQueryClient(
    <DeleteVendorDialog
      vendorId={7}
      displayName="บริษัท ตัวอย่าง จำกัด"
      trigger={<button type="button" />}
      triggerChildren="ลบ"
      onSuccess={onSuccess}
    />,
  );
  return { onSuccess, user: userEvent.setup() };
}

async function openAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "ลบ" }));
  await user.click(await screen.findByRole("button", { name: "ลบผู้ค้า" }));
}

describe("DeleteVendorDialog", () => {
  it("asks for confirmation with the vendor name", async () => {
    const { user } = renderDialog();

    await user.click(screen.getByRole("button", { name: "ลบ" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent('ต้องการลบผู้ค้า "บริษัท ตัวอย่าง จำกัด" ใช่หรือไม่?');
    expect(dialog).toHaveTextContent("ยกเลิก");
  });

  it("deletes the vendor, closes and reports success", async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(DELETE_URL, ({ params }) => {
        deleted(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, onSuccess } = renderDialog();

    await openAndConfirm(user);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ค้าสำเร็จ"));
    expect(deleted).toHaveBeenCalledWith("7");
    expect(onSuccess).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("closes without deleting when cancelled", async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(DELETE_URL, () => {
        deleted();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, onSuccess } = renderDialog();

    await user.click(screen.getByRole("button", { name: "ลบ" }));
    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(deleted).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("shows the backend message and stays open when deleting fails", async () => {
    server.use(
      http.delete(DELETE_URL, () => HttpResponse.json({ message: "ลบไม่ได้ เพราะมีการเสนอราคาแล้ว" }, { status: 422 })),
    );
    const { user, onSuccess } = renderDialog();

    await openAndConfirm(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบไม่ได้ เพราะมีการเสนอราคาแล้ว"));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to a generic message when the backend sends none", async () => {
    server.use(http.delete(DELETE_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = renderDialog();

    await openAndConfirm(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบผู้ค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  });

  it("disables the confirm button while the request is pending", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.delete(DELETE_URL, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderDialog();

    await openAndConfirm(user);

    await waitFor(() => expect(screen.getByRole("button", { name: "ลบผู้ค้า" })).toBeDisabled());
    release();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ค้าสำเร็จ"));
  });
});

describe("DeleteVendorDialog — controlled", () => {
  function Controlled({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(true);
    return (
      <>
        <span data-testid="state">{open ? "open" : "closed"}</span>
        <DeleteVendorDialog
          vendorId={7}
          displayName="ร้านตัวอย่าง"
          open={open}
          onOpenChange={setOpen}
          onSuccess={onSuccess}
        />
      </>
    );
  }

  it("is shown by the open prop without any trigger and reports closing via onOpenChange", async () => {
    server.use(http.delete(DELETE_URL, () => new HttpResponse(null, { status: 204 })));
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderWithQueryClient(<Controlled onSuccess={onSuccess} />);

    expect(await screen.findByRole("alertdialog")).toHaveTextContent('ต้องการลบผู้ค้า "ร้านตัวอย่าง" ใช่หรือไม่?');

    await user.click(screen.getByRole("button", { name: "ลบผู้ค้า" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("closed"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("ignores close requests when controlled without onOpenChange", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<DeleteVendorDialog vendorId={7} displayName="ร้านตัวอย่าง" open />);

    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
