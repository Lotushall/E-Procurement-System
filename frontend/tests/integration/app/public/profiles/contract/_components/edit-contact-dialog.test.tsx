import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import EditContactDialog from "@/app/(public)/profiles/contract/_components/edit-contact-dialog";
import { makeVendorContact } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const CONTACT_URL = apiUrl("/api/v1/vendor/contact");

// InputField ไม่ได้ผูก <label> กับ input (เป็น <p>) จึงหา input จากข้อความ label ที่อยู่ในกลุ่มเดียวกัน
function field(label: string): HTMLInputElement {
  const input = screen.getByText(label).closest("div.flex-col")?.querySelector("input");
  if (!input) throw new Error(`input not found for label ${label}`);
  return input;
}

async function openDialog(contact = makeVendorContact({ id: 5 })) {
  const user = userEvent.setup();
  renderWithQueryClient(<EditContactDialog contact={contact} />);
  await user.click(screen.getByRole("button", { name: "แก้ไขผู้ติดต่อ" }));
  await screen.findByRole("dialog");
  return user;
}

describe("EditContactDialog", () => {
  it("prefills every field from the contact", async () => {
    await openDialog(
      makeVendorContact({
        id: 5,
        contactName: "สมชาย ใจดี",
        contactPosition: "ผู้จัดการ",
        contactPhone: "0812345678",
        contactEmail: "somchai@example.com",
        lineId: "somchai",
        otherContact: "แฟกซ์ 02-111-2222",
        isMainContact: true,
      }),
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("แก้ไขข้อมูลผู้ติดต่อสำหรับการจัดซื้อจัดจ้าง");
    expect(field("ชื่อผู้ติดต่อ")).toHaveValue("สมชาย ใจดี");
    expect(field("ตำแหน่ง")).toHaveValue("ผู้จัดการ");
    expect(field("เบอร์โทร")).toHaveValue("081-234-5678");
    expect(field("อีเมล")).toHaveValue("somchai@example.com");
    expect(field("LINE ID")).toHaveValue("somchai");
    expect(field("ช่องทางติดต่ออื่น ๆ")).toHaveValue("แฟกซ์ 02-111-2222");
    expect(screen.getByRole("checkbox", { name: "เป็นผู้ติดต่อหลัก" })).toBeChecked();
  });

  it("leaves the main-contact checkbox unchecked for a non-main contact", async () => {
    await openDialog(makeVendorContact({ isMainContact: false }));
    expect(screen.getByRole("checkbox", { name: "เป็นผู้ติดต่อหลัก" })).not.toBeChecked();
  });

  it("prefills empty strings when optional fields are missing", async () => {
    await openDialog(
      makeVendorContact({
        contactPosition: undefined as unknown as string,
        contactPhone: undefined as unknown as string,
        contactEmail: undefined as unknown as string,
        lineId: undefined as unknown as string,
        otherContact: undefined as unknown as string,
      }),
    );

    expect(field("ตำแหน่ง")).toHaveValue("");
    expect(field("เบอร์โทร")).toHaveValue("");
    expect(field("อีเมล")).toHaveValue("");
    expect(field("LINE ID")).toHaveValue("");
    expect(field("ช่องทางติดต่ออื่น ๆ")).toHaveValue("");
  });

  it("sends the contact id with the edited values and closes on success", async () => {
    let body: unknown;
    server.use(
      http.post(CONTACT_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = await openDialog();

    await user.clear(field("ชื่อผู้ติดต่อ"));
    await user.type(field("ชื่อผู้ติดต่อ"), "สมศรี");
    await user.clear(field("เบอร์โทร"));
    await user.type(field("เบอร์โทร"), "021234567");
    await user.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกผู้ติดต่อสำเร็จ"));
    expect(body).toEqual({
      id: 5,
      contactName: "สมศรี",
      contactPosition: "ผู้จัดการ",
      contactPhone: "02-123-4567",
      contactEmail: "somchai@example.com",
      lineId: "somchai",
      otherContact: "",
      isMainContact: true,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("can promote a contact to main contact", async () => {
    let body: { isMainContact?: boolean } | undefined;
    server.use(
      http.post(CONTACT_URL, async ({ request }) => {
        body = (await request.json()) as { isMainContact?: boolean };
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = await openDialog(makeVendorContact({ id: 6, isMainContact: false }));

    await user.click(screen.getByRole("checkbox", { name: "เป็นผู้ติดต่อหลัก" }));
    await user.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(body?.isMainContact).toBe(true);
  });

  it("blocks submit when the name is cleared or the phone is invalid", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(CONTACT_URL, spy));
    const user = await openDialog();

    await user.clear(field("ชื่อผู้ติดต่อ"));
    await user.clear(field("เบอร์โทร"));
    await user.type(field("เบอร์โทร"), "1234");
    await user.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));

    expect(await screen.findByText("กรุณากรอกชื่อผู้ติดต่อ")).toBeInTheDocument();
    expect(screen.getByText("เบอร์โทรไม่ถูกต้อง (ขึ้นต้นด้วย 0 และมี 9-10 หลัก)")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows the backend message and stays open when saving fails", async () => {
    server.use(http.post(CONTACT_URL, () => HttpResponse.json({ message: "บันทึกไม่ได้" }, { status: 500 })));
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("บันทึกไม่ได้"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("falls back to a generic message when the backend sends none", async () => {
    server.use(http.post(CONTACT_URL, () => new HttpResponse(null, { status: 500 })));
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("บันทึกข้อมูลผู้ติดต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    );
  });

  it("discards unsaved edits when cancelled", async () => {
    const user = await openDialog();

    await user.clear(field("ชื่อผู้ติดต่อ"));
    await user.type(field("ชื่อผู้ติดต่อ"), "ชื่ออื่น");
    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "แก้ไขผู้ติดต่อ" }));
    await screen.findByRole("dialog");
    expect(field("ชื่อผู้ติดต่อ")).toHaveValue("สมชาย ใจดี");
  });
});
