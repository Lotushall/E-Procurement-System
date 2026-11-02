import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { DeleteTenderProjectDialog } from "@/app/dashboard/tender-projects/_components/dialogs/delete-tender-project-dialog";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DELETE_URL = apiUrl("/api/v1/dashboard/tender-projects/:id");

function renderDialog(onSuccess = vi.fn()) {
  renderWithQueryClient(
    <DeleteTenderProjectDialog
      tenderProjectId={7}
      displayName="จัดซื้อครุภัณฑ์คอมพิวเตอร์"
      trigger={<button type="button" />}
      triggerChildren="ลบ"
      onSuccess={onSuccess}
    />,
  );
  return { onSuccess, user: userEvent.setup() };
}

describe("DeleteTenderProjectDialog", () => {
  it("asks for confirmation with the project name", async () => {
    const { user } = renderDialog();

    await user.click(screen.getByRole("button", { name: "ลบ" }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      'ต้องการลบโครงการ "จัดซื้อครุภัณฑ์คอมพิวเตอร์" ใช่หรือไม่?',
    );
  });

  it("deletes the project, closes and reports success", async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(DELETE_URL, ({ params }) => {
        deleted(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, onSuccess } = renderDialog();

    await user.click(screen.getByRole("button", { name: "ลบ" }));
    await user.click(await screen.findByRole("button", { name: "ลบโครงการ" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบโครงการสำเร็จ"));
    expect(deleted).toHaveBeenCalledWith("7");
    expect(onSuccess).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("shows the backend message and stays open when deleting fails", async () => {
    server.use(
      http.delete(DELETE_URL, () =>
        HttpResponse.json({ message: "ลบไม่ได้ เพราะมี TOR อยู่ในโครงการ" }, { status: 422 }),
      ),
    );
    const { user, onSuccess } = renderDialog();

    await user.click(screen.getByRole("button", { name: "ลบ" }));
    await user.click(await screen.findByRole("button", { name: "ลบโครงการ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบไม่ได้ เพราะมี TOR อยู่ในโครงการ"));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to a generic message when the backend sends none", async () => {
    server.use(http.delete(DELETE_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = renderDialog();

    await user.click(screen.getByRole("button", { name: "ลบ" }));
    await user.click(await screen.findByRole("button", { name: "ลบโครงการ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบโครงการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  });
});
