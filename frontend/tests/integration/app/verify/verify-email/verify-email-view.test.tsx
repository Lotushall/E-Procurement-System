import { act, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerifyEmailView } from "@/app/(verify)/verify-email/_components/verify-email-view";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const VERIFY_URL = apiUrl("/api/v1/auth/email/verify/:id/:hash");
const VALID_URL = "/verify-email?id=7&hash=abc123&expires=1790000000&signature=sig456";

afterEach(() => {
  vi.useRealTimers();
});

describe("VerifyEmailView - invalid link", () => {
  it.each([
    ["no params", "/verify-email"],
    ["missing id", "/verify-email?hash=h&expires=1&signature=s"],
    ["missing hash", "/verify-email?id=7&expires=1&signature=s"],
    ["missing expires", "/verify-email?id=7&hash=h&signature=s"],
    ["missing signature", "/verify-email?id=7&hash=h&expires=1"],
  ])("shows the failure state and sends no request (%s)", (_label, url) => {
    const verify = vi.fn();
    server.use(
      http.get(VERIFY_URL, () => {
        verify();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    setUrl(url);

    renderWithQueryClient(<VerifyEmailView />);

    expect(screen.getByText("ยืนยันอีเมลไม่สำเร็จ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ไปหน้าเข้าสู่ระบบ" })).toHaveAttribute("href", "/login");
    expect(verify).not.toHaveBeenCalled();
  });
});

describe("VerifyEmailView - verifying", () => {
  it("sends id, hash, expires and signature from the URL and shows progress while pending", async () => {
    let received: { id?: string | readonly string[]; hash?: string | readonly string[]; query?: Record<string, string> } = {};
    server.use(
      http.get(VERIFY_URL, ({ params, request }) => {
        received = {
          id: params.id,
          hash: params.hash,
          query: Object.fromEntries(new URL(request.url).searchParams),
        };
        return new Promise<never>(() => {});
      }),
    );
    setUrl(VALID_URL);

    renderWithQueryClient(<VerifyEmailView />);

    expect(screen.getByText("กำลังยืนยันอีเมล")).toBeInTheDocument();
    expect(screen.getByText("กรุณารอสักครู่...")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "ไปหน้าเข้าสู่ระบบ" })).not.toBeInTheDocument();
    await waitFor(() => expect(received.id).toBe("7"));
    expect(received.hash).toBe("abc123");
    expect(received.query).toEqual({ expires: "1790000000", signature: "sig456" });
  });
});

describe("VerifyEmailView - result", () => {
  it("shows success and redirects to login after the delay", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(http.get(VERIFY_URL, () => new HttpResponse(null, { status: 204 })));
    setUrl(VALID_URL);

    renderWithQueryClient(<VerifyEmailView />);

    expect(await screen.findByText("ยืนยันอีเมลสำเร็จ")).toBeInTheDocument();
    expect(screen.getByText("บัญชีของคุณพร้อมใช้งานแล้ว กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("does not redirect when the view unmounts before the delay", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(http.get(VERIFY_URL, () => new HttpResponse(null, { status: 204 })));
    setUrl(VALID_URL);
    const { unmount } = renderWithQueryClient(<VerifyEmailView />);
    await screen.findByText("ยืนยันอีเมลสำเร็จ");

    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows the failure state with a login link when verification is rejected", async () => {
    server.use(http.get(VERIFY_URL, () => HttpResponse.json({ message: "expired" }, { status: 403 })));
    setUrl(VALID_URL);

    renderWithQueryClient(<VerifyEmailView />);

    expect(await screen.findByText("ยืนยันอีเมลไม่สำเร็จ")).toBeInTheDocument();
    expect(
      screen.getByText("ลิงก์ยืนยันอีเมลไม่ถูกต้องหรือหมดอายุ กรุณาลงทะเบียนใหม่หรือติดต่อเจ้าหน้าที่"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ไปหน้าเข้าสู่ระบบ" })).toHaveAttribute("href", "/login");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("shows the failure state on a server error", async () => {
    server.use(http.get(VERIFY_URL, () => new HttpResponse(null, { status: 500 })));
    setUrl(VALID_URL);

    renderWithQueryClient(<VerifyEmailView />);

    expect(await screen.findByText("ยืนยันอีเมลไม่สำเร็จ")).toBeInTheDocument();
  });
});
