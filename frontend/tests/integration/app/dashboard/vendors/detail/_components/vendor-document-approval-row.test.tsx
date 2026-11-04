import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { VendorDocumentApprovalRow } from "@/app/dashboard/vendors/detail/_components/vendor-document-approval-row";
import type { VendorDocument } from "@/lib/vendor/profile/types";
import { makeVendorDocument } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LABEL = "หนังสือรับรองบริษัท";
const FALLBACK = "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const ACTION_URL = apiUrl("/api/v1/vendors/:vendorId/documents/:documentId/:action");

function renderRow(document?: VendorDocument, props: { required?: boolean; canReview?: boolean } = {}) {
  renderWithQueryClient(
    <VendorDocumentApprovalRow
      vendorId={5}
      label={LABEL}
      required={props.required ?? true}
      document={document}
      canReview={props.canReview ?? true}
    />,
  );
  return userEvent.setup();
}

// จับ request ของ approve / reject / pending
function captureAction(status = 204, body?: unknown) {
  const calls: { vendorId: unknown; documentId: unknown; action: unknown; body: unknown }[] = [];
  server.use(
    http.post(ACTION_URL, async ({ params, request }) => {
      const text = await request.text();
      calls.push({
        vendorId: params.vendorId,
        documentId: params.documentId,
        action: params.action,
        body: text ? JSON.parse(text) : undefined,
      });
      return body === undefined ? new HttpResponse(null, { status }) : HttpResponse.json(body, { status });
    }),
  );
  return calls;
}

function gatedAction() {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.post(ACTION_URL, async () => {
      await gate;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return release;
}

describe("VendorDocumentApprovalRow — display", () => {
  it("shows a placeholder, a required marker and no actions when there is no document", () => {
    renderRow(undefined, { required: true });

    expect(screen.getByText(LABEL)).toBeInTheDocument();
    expect(screen.getByText("ยังไม่มีเอกสาร")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "เอกสารบังคับ" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("ไม่บังคับ")).not.toBeInTheDocument();
  });

  it("shows the optional badge and no required marker for an optional missing document", () => {
    renderRow(undefined, { required: false });

    expect(screen.getByText("ไม่บังคับ")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "เอกสารบังคับ" })).not.toBeInTheDocument();
  });

  it("links the label and extension badge to the document view URL in a new tab", () => {
    renderRow(makeVendorDocument({ id: 42, fileName: "cert.final.pdf", status: "pending" }));

    const url = "http://localhost:3000/api/v1/vendor/document/42/view";
    const labelLink = screen.getByRole("link", { name: LABEL });
    const iconLink = screen.getByRole("link", { name: `ดูไฟล์ ${LABEL}` });
    for (const link of [labelLink, iconLink]) {
      expect(link).toHaveAttribute("href", url);
      expect(link).toHaveAttribute("target", "_blank");
    }
    expect(iconLink).toHaveTextContent("PDF");
    expect(screen.getByText("cert.final.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "เอกสารบังคับ" })).not.toBeInTheDocument();
  });

  it.each([
    ["pending", "รอตรวจสอบ"],
    ["approved", "อนุมัติแล้ว"],
    ["rejected", "ถูกปฏิเสธ"],
  ] as const)("shows the %s status badge", (status, text) => {
    renderRow(makeVendorDocument({ status }));

    // "รอตรวจสอบ" ซ้ำกับปุ่มในสถานะอื่น — เจาะจงที่ element badge (data-slot="badge") ตัวเดียว
    const badges = Array.from(document.querySelectorAll('[data-slot="badge"]'));
    expect(badges.map((el) => el.textContent)).toEqual([text]);
  });

  it("shows the rejection reason for a rejected document with a remark", () => {
    renderRow(makeVendorDocument({ status: "rejected", remark: "ไฟล์ไม่ชัด" }));

    expect(screen.getByText("เหตุผล: ไฟล์ไม่ชัด")).toBeInTheDocument();
  });

  it("hides the reason for a rejected document without a remark", () => {
    renderRow(makeVendorDocument({ status: "rejected", remark: "" }));

    expect(screen.queryByText(/เหตุผล:/)).not.toBeInTheDocument();
  });

  it("does not show a stale reason on an approved document", () => {
    renderRow(makeVendorDocument({ status: "approved", remark: "เหตุผลเก่า" }));

    expect(screen.queryByText(/เหตุผล:/)).not.toBeInTheDocument();
  });
});

describe("VendorDocumentApprovalRow — without vendors.review", () => {
  it.each(["pending", "approved", "rejected"] as const)(
    "shows no action buttons for a %s document but keeps the view link and status",
    (status) => {
      renderRow(makeVendorDocument({ id: 42, status }), { canReview: false });

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: LABEL })).toHaveAttribute(
        "href",
        "http://localhost:3000/api/v1/vendor/document/42/view",
      );
      expect(screen.getByRole("link", { name: `ดูไฟล์ ${LABEL}` })).toBeInTheDocument();
      const badges = Array.from(document.querySelectorAll('[data-slot="badge"]'));
      expect(badges.map((el) => el.textContent)).toEqual([
        { pending: "รอตรวจสอบ", approved: "อนุมัติแล้ว", rejected: "ถูกปฏิเสธ" }[status],
      ]);
    },
  );
});

describe("VendorDocumentApprovalRow — available actions per status", () => {
  it("pending: approve and reject only", () => {
    renderRow(makeVendorDocument({ status: "pending" }));

    expect(screen.getByRole("button", { name: "อนุมัติ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ปฏิเสธ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "รอตรวจสอบ" })).not.toBeInTheDocument();
  });

  it("approved: back to pending and reject only", () => {
    renderRow(makeVendorDocument({ status: "approved" }));

    expect(screen.getByRole("button", { name: "รอตรวจสอบ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ปฏิเสธ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "อนุมัติ" })).not.toBeInTheDocument();
  });

  it("rejected: back to pending and approve only", () => {
    renderRow(makeVendorDocument({ status: "rejected" }));

    expect(screen.getByRole("button", { name: "รอตรวจสอบ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "อนุมัติ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ปฏิเสธ" })).not.toBeInTheDocument();
  });
});

describe("VendorDocumentApprovalRow — approve", () => {
  it("posts the approval for this document and toasts success", async () => {
    const calls = captureAction();
    const user = renderRow(makeVendorDocument({ id: 9, status: "pending" }));

    await user.click(screen.getByRole("button", { name: "อนุมัติ" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("อนุมัติเอกสารสำเร็จ"));
    expect(calls).toEqual([{ vendorId: "5", documentId: "9", action: "approve", body: undefined }]);
  });

  it("shows the backend message when approving fails", async () => {
    captureAction(422, { message: "เอกสารหมดอายุ" });
    const user = renderRow(makeVendorDocument({ status: "pending" }));

    await user.click(screen.getByRole("button", { name: "อนุมัติ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เอกสารหมดอายุ"));
  });

  it("falls back to a generic message when the failure has no message", async () => {
    captureAction(500);
    const user = renderRow(makeVendorDocument({ status: "pending" }));

    await user.click(screen.getByRole("button", { name: "อนุมัติ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("disables every action and shows progress text while approving", async () => {
    const release = gatedAction();
    const user = renderRow(makeVendorDocument({ status: "rejected" }));

    await user.click(screen.getByRole("button", { name: "อนุมัติ" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "กำลังดำเนินการ..." })).toBeDisabled());
    expect(screen.getByRole("button", { name: "รอตรวจสอบ" })).toBeDisabled();
    release();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("อนุมัติเอกสารสำเร็จ"));
  });
});

describe("VendorDocumentApprovalRow — set pending", () => {
  it("posts the pending request and toasts success", async () => {
    const calls = captureAction();
    const user = renderRow(makeVendorDocument({ id: 3, status: "approved" }));

    await user.click(screen.getByRole("button", { name: "รอตรวจสอบ" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ส่งกลับไปรอตรวจสอบแล้ว"));
    expect(calls).toEqual([{ vendorId: "5", documentId: "3", action: "pending", body: undefined }]);
  });

  it("shows the backend message when it fails", async () => {
    captureAction(422, { message: "ย้อนสถานะไม่ได้" });
    const user = renderRow(makeVendorDocument({ status: "approved" }));

    await user.click(screen.getByRole("button", { name: "รอตรวจสอบ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ย้อนสถานะไม่ได้"));
  });

  it("falls back to a generic message when the failure has no message", async () => {
    captureAction(500);
    const user = renderRow(makeVendorDocument({ status: "approved" }));

    await user.click(screen.getByRole("button", { name: "รอตรวจสอบ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("disables the actions and shows progress text while pending", async () => {
    const release = gatedAction();
    const user = renderRow(makeVendorDocument({ status: "approved" }));

    await user.click(screen.getByRole("button", { name: "รอตรวจสอบ" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "กำลังดำเนินการ..." })).toBeDisabled());
    expect(screen.getByRole("button", { name: "ปฏิเสธ" })).toBeDisabled();
    release();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ส่งกลับไปรอตรวจสอบแล้ว"));
  });
});

describe("VendorDocumentApprovalRow — reject", () => {
  async function openDialog(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "ปฏิเสธ" }));
    return screen.findByRole("dialog");
  }

  it("opens a dialog naming the file and requiring a reason", async () => {
    const user = renderRow(makeVendorDocument({ fileName: "abc.pdf", status: "pending" }));

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("ปฏิเสธเอกสาร");
    expect(dialog).toHaveTextContent('ระบุเหตุผลที่ปฏิเสธเอกสาร "abc.pdf"');
    expect(screen.getByRole("button", { name: "ยืนยันปฏิเสธ" })).toBeDisabled();
  });

  it("posts the trimmed reason, toasts success and closes the dialog", async () => {
    const calls = captureAction();
    const user = renderRow(makeVendorDocument({ id: 8, status: "pending" }));
    await openDialog(user);

    await user.type(screen.getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ"), "  ภาพไม่ชัด  ");
    await user.click(screen.getByRole("button", { name: "ยืนยันปฏิเสธ" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ปฏิเสธเอกสารสำเร็จ"));
    expect(calls).toEqual([{ vendorId: "5", documentId: "8", action: "reject", body: { remark: "ภาพไม่ชัด" } }]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows the backend message when rejecting fails", async () => {
    captureAction(422, { message: "ปฏิเสธไม่ได้" });
    const user = renderRow(makeVendorDocument({ status: "pending" }));
    await openDialog(user);

    await user.type(screen.getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ"), "เหตุผล");
    await user.click(screen.getByRole("button", { name: "ยืนยันปฏิเสธ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ปฏิเสธไม่ได้"));
  });

  it("falls back to a generic message when the failure has no message", async () => {
    captureAction(500);
    const user = renderRow(makeVendorDocument({ status: "pending" }));
    await openDialog(user);

    await user.type(screen.getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ"), "เหตุผล");
    await user.click(screen.getByRole("button", { name: "ยืนยันปฏิเสธ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("disables the actions and shows progress text while rejecting", async () => {
    const release = gatedAction();
    const user = renderRow(makeVendorDocument({ status: "pending" }));
    await openDialog(user);

    await user.type(screen.getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ"), "เหตุผล");
    await user.click(screen.getByRole("button", { name: "ยืนยันปฏิเสธ" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "กำลังดำเนินการ..." })).toBeDisabled());
    expect(screen.getByRole("button", { name: "อนุมัติ" })).toBeDisabled();
    release();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ปฏิเสธเอกสารสำเร็จ"));
  });

  it("sends nothing when the dialog is dismissed", async () => {
    const spy = vi.fn();
    server.use(
      http.post(ACTION_URL, () => {
        spy();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = renderRow(makeVendorDocument({ status: "pending" }));
    await openDialog(user);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(spy).not.toHaveBeenCalled();
  });
});
