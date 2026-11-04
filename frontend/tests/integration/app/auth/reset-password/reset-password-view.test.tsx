import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordView } from "@/app/(auth)/reset-password/_components/reset-password-view";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const RESET_URL = apiUrl("/api/v1/auth/password/reset");
const VALID_URL = "/reset-password?token=abc123&email=vendor%40example.com";
const FALLBACK = "ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

type User = ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  server.use(http.get(apiUrl("/sanctum/csrf-cookie"), () => new HttpResponse(null, { status: 204 })));
});

async function fillAndSubmit(user: User, password = "newpassword1", confirm = "newpassword1") {
  if (password) await user.type(screen.getByPlaceholderText("อย่างน้อย 8 ตัวอักษร"), password);
  if (confirm) await user.type(screen.getByPlaceholderText("กรอกรหัสผ่านอีกครั้ง"), confirm);
  await user.click(screen.getByRole("button", { name: "ตั้งรหัสผ่านใหม่" }));
}

describe("ResetPasswordView - invalid link", () => {
  it.each([
    ["no params", "/reset-password"],
    ["token only", "/reset-password?token=abc123"],
    ["email only", "/reset-password?email=vendor%40example.com"],
  ])("shows the invalid-link state when the URL has %s", (_label, url) => {
    setUrl(url);

    renderWithQueryClient(<ResetPasswordView />);

    expect(screen.getByText("ลิงก์ไม่ถูกต้อง")).toBeInTheDocument();
    expect(screen.getByText("ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ขอลิงก์ใหม่" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByPlaceholderText("อย่างน้อย 8 ตัวอักษร")).not.toBeInTheDocument();
  });
});

describe("ResetPasswordView - form", () => {
  it("shows the form when token and email are in the URL", () => {
    setUrl(VALID_URL);

    renderWithQueryClient(<ResetPasswordView />);

    expect(screen.getByText("กรอกรหัสผ่านใหม่ของคุณ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ตั้งรหัสผ่านใหม่" })).toBeEnabled();
  });

  it("toggles both password fields independently", async () => {
    setUrl(VALID_URL);
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordView />);
    const password = screen.getByPlaceholderText("อย่างน้อย 8 ตัวอักษร");
    const confirm = screen.getByPlaceholderText("กรอกรหัสผ่านอีกครั้ง");

    const [togglePassword, toggleConfirm] = screen.getAllByRole("button", { name: "แสดงรหัสผ่าน" });
    await user.click(togglePassword);
    expect(password).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "password");

    await user.click(toggleConfirm);
    expect(confirm).toHaveAttribute("type", "text");
  });

  it("blocks submit for an empty form", async () => {
    setUrl(VALID_URL);
    const reset = vi.fn();
    server.use(
      http.post(RESET_URL, () => {
        reset();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordView />);

    await fillAndSubmit(user, "", "");

    expect(await screen.findByText("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")).toBeInTheDocument();
    expect(screen.getByText("กรุณายืนยันรหัสผ่าน")).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it("blocks submit when the passwords differ", async () => {
    setUrl(VALID_URL);
    const reset = vi.fn();
    server.use(
      http.post(RESET_URL, () => {
        reset();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordView />);

    await fillAndSubmit(user, "newpassword1", "newpassword2");

    expect(await screen.findByText("รหัสผ่านไม่ตรงกัน")).toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
  });

  it("sends token, email and the new password then shows the success state", async () => {
    setUrl(VALID_URL);
    let body: unknown;
    server.use(
      http.post(RESET_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordView />);

    await fillAndSubmit(user);

    expect(await screen.findByText("ตั้งรหัสผ่านใหม่สำเร็จ")).toBeInTheDocument();
    expect(body).toEqual({
      email: "vendor@example.com",
      token: "abc123",
      password: "newpassword1",
      password_confirmation: "newpassword1",
    });
    expect(screen.getByRole("link", { name: "ไปหน้าเข้าสู่ระบบ" })).toHaveAttribute("href", "/login");
    expect(screen.queryByPlaceholderText("อย่างน้อย 8 ตัวอักษร")).not.toBeInTheDocument();
  });

  // current toast-only 422 behaviour — remove this test when the BUG skip below ("422 is only toasted") is fixed
  it("shows the first 422 field message in a toast and keeps the form", async () => {
    setUrl(VALID_URL);
    server.use(
      http.post(RESET_URL, () =>
        HttpResponse.json({ message: "invalid", errors: { token: ["ลิงก์หมดอายุ"] } }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordView />);

    await fillAndSubmit(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลิงก์หมดอายุ"));
    expect(screen.queryByText("ตั้งรหัสผ่านใหม่สำเร็จ")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("อย่างน้อย 8 ตัวอักษร")).toBeInTheDocument();
  });

  it.skip("BUG: app/(auth)/reset-password/_hooks/use-reset-password-form.ts:42-52 422 is only toasted; it should be shown on the field the backend names", async () => {
    setUrl(VALID_URL);
    server.use(
      http.post(RESET_URL, () =>
        HttpResponse.json(
          { message: "invalid", errors: { password: ["รหัสผ่านนี้ไม่ปลอดภัย"] } },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordView />);

    await fillAndSubmit(user);

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน form แปลว่าแสดงที่ช่องแล้ว
    const password = screen.getByPlaceholderText("อย่างน้อย 8 ตัวอักษร");
    const form = password.closest("form") as HTMLElement;
    expect(await within(form).findByText("รหัสผ่านนี้ไม่ปลอดภัย")).toBeInTheDocument();
    expect(password).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the backend message on other failures", async () => {
    setUrl(VALID_URL);
    server.use(http.post(RESET_URL, () => HttpResponse.json({ message: "ลองใหม่ภายหลัง" }, { status: 429 })));
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordView />);

    await fillAndSubmit(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลองใหม่ภายหลัง"));
  });

  it("falls back to the generic message when the backend sends none", async () => {
    setUrl(VALID_URL);
    server.use(http.post(RESET_URL, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordView />);

    await fillAndSubmit(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("disables the submit button while the request is pending", async () => {
    setUrl(VALID_URL);
    server.use(http.post(RESET_URL, () => new Promise<never>(() => {})));
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordView />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("button", { name: "กำลังบันทึก..." })).toBeDisabled();
  });
});
