import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/app/(auth)/login/page";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const LOGIN_URL = apiUrl("/api/v1/auth/login");

const csrf = vi.fn();

beforeEach(() => {
  csrf.mockReset();
  server.use(
    http.get(apiUrl("/sanctum/csrf-cookie"), () => {
      csrf();
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, identifier = "officer", password = "secret123") {
  if (identifier) await user.type(screen.getByPlaceholderText("name@company.co.th / username"), identifier);
  if (password) await user.type(screen.getByPlaceholderText("••••••••"), password);
  await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
}

describe("Login page", () => {
  it("shows the heading and navigation links", () => {
    renderWithQueryClient(<Login />);

    expect(screen.getByText("กรุณาลงชื่อเข้าใช้เพื่อดำเนินการต่อ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ลืมรหัสผ่าน?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: "ลงทะเบียนที่นี่" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "กลับหน้าแรก" })).toHaveAttribute("href", "/");
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);
    const password = screen.getByPlaceholderText("••••••••");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "แสดงรหัสผ่าน" }));
    expect(password).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "ซ่อนรหัสผ่าน" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("blocks submit and shows field errors when the fields are empty", async () => {
    const login = vi.fn();
    server.use(
      http.post(LOGIN_URL, () => {
        login();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);

    await fillAndSubmit(user, "", "");

    expect(await screen.findByText("กรุณากรอกอีเมลหรือชื่อผู้ใช้")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกรหัสผ่าน")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    expect(csrf).not.toHaveBeenCalled();
  });

  it("sends the credentials (with remember) and goes home on success", async () => {
    let body: unknown;
    server.use(
      http.post(LOGIN_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);

    await user.click(screen.getByRole("checkbox", { name: "จดจำฉัน" }));
    await fillAndSubmit(user);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
    expect(body).toEqual({ identifier: "officer", password: "secret123", remember: true });
    expect(csrf).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("sends remember=false by default", async () => {
    let body: unknown;
    server.use(
      http.post(LOGIN_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);

    await fillAndSubmit(user);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
    expect(body).toMatchObject({ remember: false });
  });

  // current toast-only 422 behaviour — remove this test when the BUG skip below ("422 is only toasted") is fixed
  it("shows the first field message of a 422 in a toast", async () => {
    server.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json(
          { message: "invalid", errors: { identifier: ["ข้อมูลเข้าสู่ระบบไม่ถูกต้อง"], password: ["อื่นๆ"] } },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);

    await fillAndSubmit(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง"));
    expect(router.push).not.toHaveBeenCalled();
  });

  it.skip("BUG: app/(auth)/login/_hooks/use-login-form.ts:27-37 422 is only toasted; it should be shown on the field the backend names", async () => {
    server.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json(
          { message: "invalid", errors: { identifier: ["ข้อมูลเข้าสู่ระบบไม่ถูกต้อง"] } },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);

    await fillAndSubmit(user);

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน form แปลว่าแสดงที่ช่องแล้ว
    const identifier = screen.getByPlaceholderText("name@company.co.th / username");
    const form = identifier.closest("form") as HTMLElement;
    expect(await within(form).findByText("ข้อมูลเข้าสู่ระบบไม่ถูกต้อง")).toBeInTheDocument();
    expect(identifier).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the backend message on other failures", async () => {
    server.use(http.post(LOGIN_URL, () => HttpResponse.json({ message: "บัญชีถูกระงับ" }, { status: 403 })));
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);

    await fillAndSubmit(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("บัญชีถูกระงับ"));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("falls back to the generic message when the backend sends none", async () => {
    server.use(http.post(LOGIN_URL, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);

    await fillAndSubmit(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  });

  it("disables the submit button while the request is pending", async () => {
    server.use(http.post(LOGIN_URL, () => new Promise<never>(() => {})));
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);

    await fillAndSubmit(user);

    const pending = await screen.findByRole("button", { name: "กำลังเข้าสู่ระบบ..." });
    expect(pending).toBeDisabled();
  });
});
