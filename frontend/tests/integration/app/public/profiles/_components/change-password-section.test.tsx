import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import ChangePasswordSection from "@/app/(public)/profiles/_components/change-password-section";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

// InputField ไม่ได้ผูก <label> กับ input (เป็น <p>) จึงหา input จากข้อความ label ที่อยู่ในกลุ่มเดียวกัน
function field(label: string): HTMLInputElement {
  const input = screen.getByText(label).closest("div.flex-col")?.querySelector("input");
  if (!input) throw new Error(`input not found for label ${label}`);
  return input;
}

const CHANGE_URL = apiUrl("/api/v1/auth/password/change");

type User = ReturnType<typeof userEvent.setup>;

async function fill(user: User, current: string, next: string, confirm: string) {
  await user.type(field("รหัสผ่านปัจจุบัน"), current);
  await user.type(field("รหัสผ่านใหม่"), next);
  await user.type(field("ยืนยันรหัสผ่านใหม่"), confirm);
}

function submitButton() {
  return screen.getByRole("button", { name: "เปลี่ยนรหัสผ่าน" });
}

describe("ChangePasswordSection", () => {
  it("blocks submit when the passwords do not match", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(CHANGE_URL, spy));
    const user = userEvent.setup();
    renderWithQueryClient(<ChangePasswordSection />);

    await fill(user, "oldpass", "newpassword", "different");
    await user.click(submitButton());

    expect(await screen.findByText("รหัสผ่านไม่ตรงกัน")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows required-field errors on an empty submit", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(CHANGE_URL, spy));
    const user = userEvent.setup();
    renderWithQueryClient(<ChangePasswordSection />);

    await user.click(submitButton());

    expect(await screen.findByText("กรุณากรอกรหัสผ่านปัจจุบัน")).toBeInTheDocument();
    expect(screen.getByText("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("sends the payload with password_confirmation, toasts and resets the form", async () => {
    let body: unknown;
    server.use(
      http.post(CHANGE_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ChangePasswordSection />);

    await fill(user, "oldpass", "newpassword", "newpassword");
    await user.click(submitButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เปลี่ยนรหัสผ่านแล้ว"));
    expect(body).toEqual({
      currentPassword: "oldpass",
      password: "newpassword",
      password_confirmation: "newpassword",
    });
    await waitFor(() => expect(field("รหัสผ่านปัจจุบัน")).toHaveValue(""));
    expect(field("รหัสผ่านใหม่")).toHaveValue("");
    expect(field("ยืนยันรหัสผ่านใหม่")).toHaveValue("");
  });

  it("disables the button and shows progress while submitting", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(CHANGE_URL, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ChangePasswordSection />);

    await fill(user, "oldpass", "newpassword", "newpassword");
    await user.click(submitButton());

    expect(await screen.findByRole("button", { name: "กำลังเปลี่ยนรหัสผ่าน..." })).toBeDisabled();
    release();
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it("on a 422 toasts a check-the-form message and keeps the form", async () => {
    server.use(
      http.post(CHANGE_URL, () =>
        HttpResponse.json(
          { message: "invalid", errors: { currentPassword: ["รหัสผ่านปัจจุบันไม่ถูกต้อง"] } },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ChangePasswordSection />);

    await fill(user, "wrong", "newpassword", "newpassword");
    await user.click(submitButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(field("รหัสผ่านปัจจุบัน")).toHaveValue("wrong");
  });

  it("shows a 422 wrong current password on the current password field", async () => {
    server.use(
      http.post(CHANGE_URL, () =>
        HttpResponse.json(
          { message: "invalid", errors: { currentPassword: ["รหัสผ่านปัจจุบันไม่ถูกต้อง"] } },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ChangePasswordSection />);

    await fill(user, "wrong", "newpassword", "newpassword");
    await user.click(submitButton());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน form แปลว่าแสดงที่ช่องแล้ว
    const form = field("รหัสผ่านปัจจุบัน").closest("form") as HTMLElement;
    expect(await within(form).findByText("รหัสผ่านปัจจุบันไม่ถูกต้อง")).toBeInTheDocument();
    expect(field("รหัสผ่านปัจจุบัน")).toHaveAttribute("aria-invalid", "true");
  });

  it("toasts the backend message on other failures", async () => {
    server.use(http.post(CHANGE_URL, () => HttpResponse.json({ message: "ระบบขัดข้อง" }, { status: 500 })));
    const user = userEvent.setup();
    renderWithQueryClient(<ChangePasswordSection />);

    await fill(user, "oldpass", "newpassword", "newpassword");
    await user.click(submitButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ระบบขัดข้อง"));
  });

  it("falls back to the Thai default message when the failure has no message", async () => {
    server.use(http.post(CHANGE_URL, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithQueryClient(<ChangePasswordSection />);

    await fill(user, "oldpass", "newpassword", "newpassword");
    await user.click(submitButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    );
  });

  it("toggles visibility of each password field independently", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ChangePasswordSection />);
    const current = field("รหัสผ่านปัจจุบัน");
    const next = field("รหัสผ่านใหม่");
    const confirm = field("ยืนยันรหัสผ่านใหม่");
    expect([current, next, confirm].map((el) => el.getAttribute("type"))).toEqual(["password", "password", "password"]);

    const toggles = screen.getAllByRole("button", { name: "แสดงรหัสผ่าน" });
    await user.click(toggles[0]);
    expect(current).toHaveAttribute("type", "text");
    expect(next).toHaveAttribute("type", "password");

    await user.click(toggles[1]);
    await user.click(toggles[2]);
    expect(next).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "text");

    await user.click(screen.getAllByRole("button", { name: "ซ่อนรหัสผ่าน" })[0]);
    expect(current).toHaveAttribute("type", "password");
  });
});
