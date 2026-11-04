import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "@/app/(auth)/forgot-password/page";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const FORGOT_URL = apiUrl("/api/v1/auth/password/forgot");
const EMAIL_PLACEHOLDER = "name@company.co.th";
const FALLBACK = "ส่งลิงก์ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

type User = ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  server.use(http.get(apiUrl("/sanctum/csrf-cookie"), () => new HttpResponse(null, { status: 204 })));
});

afterEach(() => {
  vi.useRealTimers();
});

async function submitEmail(user: User, email = "vendor@example.com") {
  if (email) await user.type(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), email);
  await user.click(screen.getByRole("button", { name: "ส่งลิงก์รีเซ็ตรหัสผ่าน" }));
}

function waitOutCooldown() {
  for (let i = 0; i < 60; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe("Forgot password page - form", () => {
  it("shows the heading and a link back to login", () => {
    renderWithQueryClient(<ForgotPassword />);

    expect(screen.getByText("ลืมรหัสผ่าน")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "เข้าสู่ระบบ" })).toHaveAttribute("href", "/login");
  });

  it("blocks submit and shows the error for an invalid email", async () => {
    const forgot = vi.fn();
    server.use(
      http.post(FORGOT_URL, () => {
        forgot();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);

    await submitEmail(user, "not-an-email");

    expect(await screen.findByText("กรุณากรอกอีเมลให้ถูกต้อง")).toBeInTheDocument();
    expect(forgot).not.toHaveBeenCalled();
  });

  it("blocks submit when the email is empty", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);

    await submitEmail(user, "");

    expect(await screen.findByText("กรุณากรอกอีเมลให้ถูกต้อง")).toBeInTheDocument();
  });

  it("sends the email and shows the check-your-inbox state", async () => {
    let body: unknown;
    server.use(
      http.post(FORGOT_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);

    await submitEmail(user);

    expect(await screen.findByText("ตรวจสอบอีเมลของคุณ")).toBeInTheDocument();
    expect(body).toEqual({ email: "vendor@example.com" });
    expect(screen.getByText("vendor@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "กลับไปเข้าสู่ระบบ" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("button", { name: "ลองอีกครั้งได้ใน 60 วินาที" })).toBeDisabled();
  });

  it("toasts a check-the-form message on a 422 and stays on the form", async () => {
    server.use(
      http.post(FORGOT_URL, () =>
        HttpResponse.json({ message: "invalid", errors: { email: ["ไม่พบอีเมลนี้"] } }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);

    await submitEmail(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(screen.queryByText("ตรวจสอบอีเมลของคุณ")).not.toBeInTheDocument();
  });

  it("shows a 422 on the email field the backend names", async () => {
    server.use(
      http.post(FORGOT_URL, () =>
        HttpResponse.json({ message: "invalid", errors: { email: ["ไม่พบอีเมลนี้"] } }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);

    await submitEmail(user);

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน form แปลว่าแสดงที่ช่องแล้ว
    const email = screen.getByPlaceholderText(EMAIL_PLACEHOLDER);
    const form = email.closest("form") as HTMLElement;
    expect(await within(form).findByText("ไม่พบอีเมลนี้")).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the backend message on other failures", async () => {
    server.use(http.post(FORGOT_URL, () => HttpResponse.json({ message: "ส่งอีเมลบ่อยเกินไป" }, { status: 429 })));
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);

    await submitEmail(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ส่งอีเมลบ่อยเกินไป"));
  });

  it("falls back to the generic message when the backend sends none", async () => {
    server.use(http.post(FORGOT_URL, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);

    await submitEmail(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("disables the submit button while the request is pending", async () => {
    server.use(http.post(FORGOT_URL, () => new Promise<never>(() => {})));
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);

    await submitEmail(user);

    expect(await screen.findByRole("button", { name: "กำลังส่ง..." })).toBeDisabled();
  });
});

describe("Forgot password page - resend", () => {
  async function reachSentState(user: User) {
    await submitEmail(user);
    await screen.findByText("ตรวจสอบอีเมลของคุณ");
  }

  it("counts the cooldown down and enables resend after 60 seconds", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    server.use(http.post(FORGOT_URL, () => new HttpResponse(null, { status: 204 })));
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);
    await reachSentState(user);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: "ลองอีกครั้งได้ใน 59 วินาที" })).toBeDisabled();

    for (let i = 0; i < 59; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByRole("button", { name: "ไม่ได้รับอีเมล? ลองอีกครั้ง" })).toBeEnabled();
  });

  it("resends to the same address, toasts success and restarts the cooldown", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const bodies: unknown[] = [];
    server.use(
      http.post(FORGOT_URL, async ({ request }) => {
        bodies.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);
    await reachSentState(user);
    waitOutCooldown();

    await user.click(screen.getByRole("button", { name: "ไม่ได้รับอีเมล? ลองอีกครั้ง" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("ส่งลิงก์ตั้งรหัสผ่านใหม่อีกครั้งแล้ว กรุณาตรวจสอบกล่องจดหมาย"),
    );
    expect(bodies).toEqual([{ email: "vendor@example.com" }, { email: "vendor@example.com" }]);
    expect(await screen.findByRole("button", { name: "ลองอีกครั้งได้ใน 60 วินาที" })).toBeDisabled();
  });

  it("toasts the backend message when resending fails", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    let calls = 0;
    server.use(
      http.post(FORGOT_URL, () => {
        calls += 1;
        return calls === 1
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.json({ message: "ส่งอีเมลบ่อยเกินไป" }, { status: 429 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);
    await reachSentState(user);
    waitOutCooldown();

    await user.click(screen.getByRole("button", { name: "ไม่ได้รับอีเมล? ลองอีกครั้ง" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ส่งอีเมลบ่อยเกินไป"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("toasts the fallback message when resending fails without a message", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    let calls = 0;
    server.use(
      http.post(FORGOT_URL, () => {
        calls += 1;
        return new HttpResponse(null, { status: calls === 1 ? 204 : 500 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPassword />);
    await reachSentState(user);
    waitOutCooldown();

    await user.click(screen.getByRole("button", { name: "ไม่ได้รับอีเมล? ลองอีกครั้ง" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});
