import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import DocumentRow from "@/app/(public)/profiles/document/_components/document-row";
import { makeVendorDocument } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DOCUMENT_URL = apiUrl("/api/v1/vendor/document");

type RowProps = Partial<React.ComponentProps<typeof DocumentRow>>;

function renderRow(props: RowProps = {}) {
  // applyAccept: false เพื่อให้ทดสอบไฟล์ผิดชนิดที่ผ่านเข้ามาถึง handler ได้ (ใน browser ผู้ใช้เลือก "All files" ได้)
  const user = userEvent.setup({ applyAccept: false });
  const rendered = renderWithQueryClient(
    <DocumentRow
      documentType="company_certificate"
      label="หนังสือรับรองบริษัท"
      required
      fileKind="pdf"
      {...props}
    />,
  );
  const input = rendered.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  return { user, input, ...rendered };
}

const pdf = (name = "cert.pdf") => new File(["%PDF-1.4"], name, { type: "application/pdf" });

describe("DocumentRow without a document", () => {
  it("shows the empty state, the required marker and the attach button", () => {
    renderRow();

    expect(screen.getByText("หนังสือรับรองบริษัท")).toBeInTheDocument();
    expect(screen.getByText("ยังไม่มีเอกสาร")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "เอกสารบังคับ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แนบไฟล์" })).toBeEnabled();
    expect(screen.queryByText("ไม่บังคับ")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ลบไฟล์" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows the optional badge and no required marker for an optional document", () => {
    renderRow({ required: false });

    expect(screen.getByText("ไม่บังคับ")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "เอกสารบังคับ" })).not.toBeInTheDocument();
  });

  it("restricts the file input to the kind's extensions", () => {
    const { input, unmount } = renderRow({ fileKind: "pdf" });
    expect(input).toHaveAttribute("accept", ".pdf");
    unmount();

    const image = renderRow({ fileKind: "image" });
    expect(image.input).toHaveAttribute("accept", ".jpg,.jpeg,.png");
  });

  it("opens the file picker when the attach button is clicked", async () => {
    const { user, input } = renderRow();
    const click = vi.spyOn(input, "click");

    await user.click(screen.getByRole("button", { name: "แนบไฟล์" }));

    expect(click).toHaveBeenCalledOnce();
  });
});

describe("DocumentRow with an existing document", () => {
  it.each([
    ["pending", "รอตรวจสอบ"],
    ["approved", "อนุมัติแล้ว"],
    ["rejected", "ถูกปฏิเสธ"],
  ])("shows the %s status badge", (status, label) => {
    renderRow({ existingDocument: makeVendorDocument({ status }) });

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getAllByText(/รอตรวจสอบ|อนุมัติแล้ว|ถูกปฏิเสธ/)).toHaveLength(1);
  });

  it("shows the file name, extension tile, replace and delete buttons and hides the required marker", () => {
    renderRow({ existingDocument: makeVendorDocument({ fileName: "certificate.pdf" }) });

    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "certificate.pdf" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เปลี่ยนไฟล์" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "ลบไฟล์" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "เอกสารบังคับ" })).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีเอกสาร")).not.toBeInTheDocument();
  });

  it("links the label, the tile and the file name to the document view URL in a new tab", () => {
    renderRow({ existingDocument: makeVendorDocument({ id: 42, fileName: "certificate.pdf" }) });

    const expected = "http://localhost:3000/api/v1/vendor/document/42/view";
    for (const link of [
      screen.getByRole("link", { name: "ดูไฟล์ certificate.pdf" }),
      screen.getByRole("link", { name: "หนังสือรับรองบริษัท" }),
      screen.getByRole("link", { name: "certificate.pdf" }),
    ]) {
      expect(link).toHaveAttribute("href", expected);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener");
    }
  });

  it("shows the reject reason only for rejected documents", () => {
    const { unmount } = renderRow({
      existingDocument: makeVendorDocument({ status: "rejected", remark: "ภาพไม่ชัดเจน" }),
    });
    expect(screen.getByText("เหตุผล: ภาพไม่ชัดเจน")).toBeInTheDocument();
    unmount();

    renderRow({ existingDocument: makeVendorDocument({ status: "approved", remark: "ผ่านแล้ว" }) });
    expect(screen.queryByText(/เหตุผล:/)).not.toBeInTheDocument();
  });

  it("omits the reject reason line when a rejected document has no remark", () => {
    renderRow({ existingDocument: makeVendorDocument({ status: "rejected", remark: undefined }) });

    expect(screen.getByText("ถูกปฏิเสธ")).toBeInTheDocument();
    expect(screen.queryByText(/เหตุผล:/)).not.toBeInTheDocument();
  });

  it("shows no status badge for an unknown status", () => {
    renderRow({ existingDocument: makeVendorDocument({ status: "mystery" }) });
    expect(screen.queryByText(/รอตรวจสอบ|อนุมัติแล้ว|ถูกปฏิเสธ/)).not.toBeInTheDocument();
  });
});

describe("DocumentRow uploading", () => {
  it("posts the chosen file as multipart form data, toasts, and settles back", async () => {
    let raw = "";
    let contentType: string | null = null;
    server.use(
      http.post(DOCUMENT_URL, async ({ request }) => {
        contentType = request.headers.get("content-type");
        raw = await request.text();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    vi.mocked(toast.loading).mockReturnValue("toast-1");
    const { user, input } = renderRow();

    await user.upload(input, pdf());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("อัปโหลดเอกสารสำเร็จ", { id: "toast-1" }));
    expect(toast.loading).toHaveBeenCalledWith("กำลังอัปโหลดเอกสาร...");
    expect(contentType).toMatch(/^multipart\/form-data/);
    expect(raw).toContain('name="documentType"\r\n\r\ncompany_certificate');
    expect(raw).toContain('name="file"; filename="cert.pdf"');
    expect(raw).toContain("Content-Type: application/pdf");
    expect(raw).toContain("%PDF-1.4");
    expect(toast.error).not.toHaveBeenCalled();
    // เมื่อจบแล้ว ไม่ค้างสถานะอัปโหลด และ input ถูกล้างเพื่อให้เลือกไฟล์เดิมซ้ำได้
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(input.value).toBe("");
    expect(screen.getByRole("button", { name: "แนบไฟล์" })).toBeEnabled();
  });

  it("replaces an existing document using the same request", async () => {
    const received = vi.fn();
    server.use(
      http.post(DOCUMENT_URL, async ({ request }) => {
        received(await request.text());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, input } = renderRow({ existingDocument: makeVendorDocument({ fileName: "old.pdf" }) });

    await user.upload(input, pdf("new.pdf"));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("อัปโหลดเอกสารสำเร็จ", { id: undefined }));
    expect(received).toHaveBeenCalledOnce();
    const raw = received.mock.calls[0][0] as string;
    expect(raw).toContain('name="documentType"\r\n\r\ncompany_certificate');
    expect(raw).toContain('name="file"; filename="new.pdf"');
    expect(raw).toContain("%PDF-1.4");
  });

  it("shows the selected file as pending, with progress and a cancel button, while uploading", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(DOCUMENT_URL, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, input } = renderRow({
      existingDocument: makeVendorDocument({ id: 3, fileName: "old.pdf", status: "approved" }),
    });

    await user.upload(input, new File([new Uint8Array(1536)], "new.pdf", { type: "application/pdf" }));

    expect(await screen.findByRole("progressbar", { name: "ความคืบหน้าการอัปโหลด" })).toBeInTheDocument();
    expect(screen.getByText("new.pdf · 1.5 KB")).toBeInTheDocument();
    // สถานะระหว่างอัปโหลดเป็น "รอตรวจสอบ" เสมอ ไม่ใช่สถานะเดิม
    expect(screen.getByText("รอตรวจสอบ")).toBeInTheDocument();
    expect(screen.queryByText("อนุมัติแล้ว")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เปลี่ยนไฟล์" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ลบไฟล์" })).not.toBeInTheDocument();
    // ระหว่างอัปโหลดไม่ให้เปิดไฟล์เดิม
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    release();
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "ลบไฟล์" })).toBeInTheDocument();
  });

  it.each([
    [500, "500 B"],
    [1536, "1.5 KB"],
    [3 * 1024 * 1024, "3.0 MB"],
  ])("shows the selected file's size while uploading (%i bytes)", async (size, text) => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(DOCUMENT_URL, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, input } = renderRow();

    await user.upload(input, new File([new Uint8Array(size)], "big.pdf", { type: "application/pdf" }));

    expect(await screen.findByText(`big.pdf · ${text}`)).toBeInTheDocument();
    release();
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("cancels the upload, dismisses the loading toast and tells the user", async () => {
    server.use(http.post(DOCUMENT_URL, () => new Promise(() => {})));
    vi.mocked(toast.loading).mockReturnValue("toast-9");
    const { user, input } = renderRow();

    await user.upload(input, pdf());
    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(toast.message).toHaveBeenCalledWith("ยกเลิกการอัปโหลดแล้ว"));
    expect(toast.dismiss).toHaveBeenCalledWith("toast-9");
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "แนบไฟล์" })).toBeEnabled();
  });

  it("shows the backend message when the upload fails", async () => {
    server.use(http.post(DOCUMENT_URL, () => HttpResponse.json({ message: "ไฟล์ใหญ่เกินกำหนด" }, { status: 422 })));
    vi.mocked(toast.loading).mockReturnValue("toast-2");
    const { user, input } = renderRow();

    await user.upload(input, pdf());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไฟล์ใหญ่เกินกำหนด", { id: "toast-2" }));
    expect(toast.success).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "แนบไฟล์" })).toBeEnabled();
  });

  it("falls back to a generic message when the backend sends none", async () => {
    server.use(http.post(DOCUMENT_URL, () => new HttpResponse(null, { status: 500 })));
    vi.mocked(toast.loading).mockReturnValue("toast-3");
    const { user, input } = renderRow();

    await user.upload(input, pdf());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("อัปโหลดเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", { id: "toast-3" }),
    );
  });
});

describe("DocumentRow file type validation", () => {
  it.each([
    ["pdf", "photo.png", "ไฟล์ต้องเป็น PDF เท่านั้น"],
    ["pdf", "notes.docx", "ไฟล์ต้องเป็น PDF เท่านั้น"],
    ["image", "scan.pdf", "ไฟล์ต้องเป็นรูปภาพ (JPG, JPEG, PNG) เท่านั้น"],
    ["image", "scan.gif", "ไฟล์ต้องเป็นรูปภาพ (JPG, JPEG, PNG) เท่านั้น"],
  ] as const)("rejects %s kind with %s without sending anything", async (fileKind, name, message) => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(DOCUMENT_URL, spy));
    const { user, input } = renderRow({ fileKind });

    await user.upload(input, new File(["x"], name));

    expect(toast.error).toHaveBeenCalledWith(message);
    expect(toast.loading).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it.each(["scan.jpg", "scan.JPEG", "scan.png"])("accepts %s for an image document", async (name) => {
    const received = vi.fn();
    server.use(
      http.post(DOCUMENT_URL, async ({ request }) => {
        received(await request.text());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, input } = renderRow({ fileKind: "image", documentType: "authorized_person_id" });

    await user.upload(input, new File(["img"], name, { type: "image/png" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(received.mock.calls[0][0]).toContain(`filename="${name}"`);
    expect(received.mock.calls[0][0]).toContain("authorized_person_id");
  });

  it("matches the extension case-insensitively for PDF", async () => {
    server.use(http.post(DOCUMENT_URL, () => new HttpResponse(null, { status: 204 })));
    const { user, input } = renderRow();

    await user.upload(input, pdf("CERT.PDF"));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe("DocumentRow delete", () => {
  it("deletes the existing document through the confirm dialog", async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(apiUrl("/api/v1/vendor/document/:id"), ({ params }) => {
        deleted(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderRow({ existingDocument: makeVendorDocument({ id: 8, fileName: "certificate.pdf" }) });

    await user.click(screen.getByRole("button", { name: "ลบไฟล์" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "ลบเอกสาร" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบเอกสารสำเร็จ"));
    expect(deleted).toHaveBeenCalledWith("8");
  });
});
