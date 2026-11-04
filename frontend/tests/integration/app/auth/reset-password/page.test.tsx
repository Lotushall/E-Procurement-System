import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { setUrl } from "@/tests/mocks/next-navigation";

// ให้ view suspend ได้ตามต้องการ เพื่อเห็น fallback ของ <Suspense> (useSearchParams ใน test ไม่ suspend เอง)
const control = vi.hoisted(() => ({ suspend: false }));

vi.mock("@/app/(auth)/reset-password/_components/reset-password-view", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/(auth)/reset-password/_components/reset-password-view")>();
  return {
    ResetPasswordView: () => {
      if (control.suspend) throw new Promise<never>(() => {});
      return <actual.ResetPasswordView />;
    },
  };
});

describe("ResetPasswordPage", () => {
  it("renders the reset form for a valid link", () => {
    control.suspend = false;
    setUrl("/reset-password?token=abc123&email=vendor%40example.com");

    renderWithQueryClient(<ResetPasswordPage />);

    expect(screen.getByRole("button", { name: "ตั้งรหัสผ่านใหม่" })).toBeInTheDocument();
  });

  it("renders the invalid-link state without a token", () => {
    control.suspend = false;
    setUrl("/reset-password");

    renderWithQueryClient(<ResetPasswordPage />);

    expect(screen.getByText("ลิงก์ไม่ถูกต้อง")).toBeInTheDocument();
  });

  it("shows the loading fallback while the view is suspended", () => {
    control.suspend = true;

    renderWithQueryClient(<ResetPasswordPage />);

    expect(screen.getByText("กำลังโหลด")).toBeInTheDocument();
    expect(screen.getByText("กรุณารอสักครู่...")).toBeInTheDocument();
  });
});
