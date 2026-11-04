import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VerifyEmailPage from "@/app/(verify)/verify-email/page";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { setUrl } from "@/tests/mocks/next-navigation";

// ให้ view suspend ได้ตามต้องการ เพื่อเห็น fallback ของ <Suspense> (useSearchParams ใน test ไม่ suspend เอง)
const control = vi.hoisted(() => ({ suspend: false }));

vi.mock("@/app/(verify)/verify-email/_components/verify-email-view", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/(verify)/verify-email/_components/verify-email-view")>();
  return {
    VerifyEmailView: () => {
      if (control.suspend) throw new Promise<never>(() => {});
      return <actual.VerifyEmailView />;
    },
  };
});

describe("VerifyEmailPage", () => {
  it("renders the verify-email view", () => {
    control.suspend = false;
    setUrl("/verify-email");

    renderWithQueryClient(<VerifyEmailPage />);

    expect(screen.getByText("ยืนยันอีเมลไม่สำเร็จ")).toBeInTheDocument();
  });

  it("shows the loading fallback while the view is suspended", () => {
    control.suspend = true;

    renderWithQueryClient(<VerifyEmailPage />);

    expect(screen.getByText("กำลังยืนยันอีเมล")).toBeInTheDocument();
    expect(screen.getByText("กรุณารอสักครู่...")).toBeInTheDocument();
  });
});
