import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RejectReasonDialog } from "@/app/dashboard/vendors/detail/_components/reject-reason-dialog";

function renderDialog(props: { isPending?: boolean; onConfirm?: (remark: string) => void } = {}) {
  const onConfirm = props.onConfirm ?? vi.fn();
  render(
    <RejectReasonDialog
      trigger={<button type="button" />}
      triggerChildren="ปฏิเสธ"
      title="ปฏิเสธผู้ค้า"
      description="ระบุเหตุผลที่ปฏิเสธผู้ค้ารายนี้"
      isPending={props.isPending ?? false}
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm, user: userEvent.setup() };
}

const reasonBox = () => screen.getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ");
const confirmButton = () => screen.getByRole("button", { name: "ยืนยันปฏิเสธ" });

describe("RejectReasonDialog", () => {
  it("shows the title, description and an empty reason box when opened", async () => {
    const { user } = renderDialog();

    await user.click(screen.getByRole("button", { name: "ปฏิเสธ" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("ปฏิเสธผู้ค้า");
    expect(dialog).toHaveTextContent("ระบุเหตุผลที่ปฏิเสธผู้ค้ารายนี้");
    expect(reasonBox()).toHaveValue("");
  });

  it("requires a reason: confirm stays disabled for empty and whitespace-only input", async () => {
    const { user, onConfirm } = renderDialog();
    await user.click(screen.getByRole("button", { name: "ปฏิเสธ" }));
    await screen.findByRole("dialog");

    expect(confirmButton()).toBeDisabled();

    await user.type(reasonBox(), "   ");
    expect(confirmButton()).toBeDisabled();

    await user.type(reasonBox(), "ไม่ครบ");
    expect(confirmButton()).toBeEnabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("sends the trimmed reason and closes", async () => {
    const { user, onConfirm } = renderDialog();
    await user.click(screen.getByRole("button", { name: "ปฏิเสธ" }));
    await screen.findByRole("dialog");

    await user.type(reasonBox(), "  เอกสารไม่ครบ  ");
    await user.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith("เอกสารไม่ครบ");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("clears the reason when closed without confirming", async () => {
    const { user, onConfirm } = renderDialog();
    await user.click(screen.getByRole("button", { name: "ปฏิเสธ" }));
    await screen.findByRole("dialog");
    await user.type(reasonBox(), "เหตุผลที่พิมพ์ไว้");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "ปฏิเสธ" }));
    await screen.findByRole("dialog");

    expect(reasonBox()).toHaveValue("");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps confirm disabled while a request is pending even with a reason", async () => {
    const { user } = renderDialog({ isPending: true });
    await user.click(screen.getByRole("button", { name: "ปฏิเสธ" }));
    await screen.findByRole("dialog");

    await user.type(reasonBox(), "เอกสารไม่ครบ");

    expect(confirmButton()).toBeDisabled();
  });
});
