import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import AddContactDialog from "@/app/(public)/profiles/contract/_components/add-contact-dialog";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const CONTACT_URL = apiUrl("/api/v1/vendor/contact");

// InputField ไม่ได้ผูก <label> กับ input (เป็น <p>) จึงหา input จากข้อความ label ที่อยู่ในกลุ่มเดียวกัน
function field(label: string): HTMLInputElement {
  const input = screen.getByText(label).closest("div.flex-col")?.querySelector("input");
  if (!input) throw new Error(`input not found for label ${label}`);
  return input;
}

async function openDialog() {
  const user = userEvent.setup();
  renderWithQueryClient(<AddContactDialog />);
  await user.click(screen.getByRole("button", { name: "เพิ่มผู้ติดต่อ" }));
  await screen.findByRole("dialog");
  return user;
}

describe("AddContactDialog", () => {
  it("opens with an empty form", async () => {
    await openDialog();

    expect(screen.getByRole("dialog")).toHaveTextContent("กรอกข้อมูลผู้ติดต่อสำหรับการจัดซื้อจัดจ้าง");
    expect(field("ชื่อผู้ติดต่อ")).toHaveValue("");
    expect(field("เบอร์โทร")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "เป็นผู้ติดต่อหลัก" })).not.toBeChecked();
  });

  it("blocks submit when the name is empty and the phone is invalid", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(CONTACT_URL, spy));
    const user = await openDialog();

    await user.type(field("เบอร์โทร"), "1234");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText("กรุณากรอกชื่อผู้ติดต่อ")).toBeInTheDocument();
    expect(screen.getByText("เบอร์โทรไม่ถูกต้อง (ขึ้นต้นด้วย 0 และมี 9-10 หลัก)")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("blocks submit for an invalid email", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(CONTACT_URL, spy));
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง");
    await user.type(field("อีเมล"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText("อีเมลไม่ถูกต้อง")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("sends the formatted phone and every field, then toasts and closes", async () => {
    let body: unknown;
    server.use(
      http.post(CONTACT_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง รักดี");
    await user.type(field("ตำแหน่ง"), "เจ้าหน้าที่จัดซื้อ");
    await user.type(field("เบอร์โทร"), "0812345678");
    await user.type(field("อีเมล"), "somying@example.com");
    await user.type(field("LINE ID"), "somying");
    await user.type(field("ช่องทางติดต่ออื่น ๆ"), "โทรสาร 02-111-2222");
    await user.click(screen.getByRole("checkbox", { name: "เป็นผู้ติดต่อหลัก" }));
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกผู้ติดต่อสำเร็จ"));
    expect(body).toEqual({
      contactName: "สมหญิง รักดี",
      contactPosition: "เจ้าหน้าที่จัดซื้อ",
      contactPhone: "081-234-5678",
      contactEmail: "somying@example.com",
      lineId: "somying",
      otherContact: "โทรสาร 02-111-2222",
      isMainContact: true,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("allows the optional fields to stay empty", async () => {
    let body: unknown;
    server.use(
      http.post(CONTACT_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกผู้ติดต่อสำเร็จ"));
    expect(body).toMatchObject({ contactName: "สมหญิง", contactPhone: "", isMainContact: false });
  });

  it("on a 422 toasts a check-the-form message and stays open", async () => {
    server.use(
      http.post(CONTACT_URL, () =>
        HttpResponse.json({ message: "invalid", errors: { contactEmail: ["อีเมลนี้ถูกใช้แล้ว"] } }, { status: 422 }),
      ),
    );
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows a 422 on the contact email field the backend names", async () => {
    server.use(
      http.post(CONTACT_URL, () =>
        HttpResponse.json({ message: "invalid", errors: { contactEmail: ["อีเมลนี้ถูกใช้แล้ว"] } }, { status: 422 }),
      ),
    );
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน dialog แปลว่าแสดงที่ช่องแล้ว
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("อีเมลนี้ถูกใช้แล้ว")).toBeInTheDocument();
    expect(field("อีเมล")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a 422 on the main-contact checkbox, which has no text input", async () => {
    server.use(
      http.post(CONTACT_URL, () =>
        HttpResponse.json(
          { message: "invalid", errors: { isMainContact: ["มีผู้ติดต่อหลักอยู่แล้ว"] } },
          { status: 422 },
        ),
      ),
    );
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("มีผู้ติดต่อหลักอยู่แล้ว")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "เป็นผู้ติดต่อหลัก" })).toHaveAttribute("aria-invalid", "true");
    expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก");
  });

  it("shows the backend message for other failures", async () => {
    server.use(http.post(CONTACT_URL, () => HttpResponse.json({ message: "เซิร์ฟเวอร์ขัดข้อง" }, { status: 500 })));
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เซิร์ฟเวอร์ขัดข้อง"));
  });

  it("falls back to a generic message when the backend sends none", async () => {
    server.use(http.post(CONTACT_URL, () => new HttpResponse(null, { status: 500 })));
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("บันทึกข้อมูลผู้ติดต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    );
  });

  it("disables the save button while the request is pending", async () => {
    server.use(http.post(CONTACT_URL, () => new Promise(() => {})));
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง");
    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "บันทึก" })).toBeDisabled());
  });

  it("clears the form when cancelled and reopened", async () => {
    const user = await openDialog();

    await user.type(field("ชื่อผู้ติดต่อ"), "สมหญิง");
    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "เพิ่มผู้ติดต่อ" }));
    await screen.findByRole("dialog");
    expect(field("ชื่อผู้ติดต่อ")).toHaveValue("");
  });
});
