import { screen, waitFor } from "@testing-library/react";
import { http } from "msw/http";
import { describe, expect, it } from "vitest";
import DashboardPage from "@/app/dashboard/page";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("DashboardPage", () => {
  it("greets the signed-in user by username", async () => {
    signInAs({ username: "somchai" });

    renderWithQueryClient(<DashboardPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "ยินดีต้อนรับ, somchai" })).toBeInTheDocument();
    expect(
      screen.getByText("นี่คือหน้าแดชบอร์ดสำหรับผู้ใช้งานภายใน เนื้อหาส่วนนี้จะถูกเพิ่มเติมในภายหลัง"),
    ).toBeInTheDocument();
  });

  it("shows a generic welcome without a name while the user is loading", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));

    renderWithQueryClient(<DashboardPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^ยินดีต้อนรับ$/);
  });

  it("shows the generic welcome when nobody is signed in", async () => {
    signOut();

    const { queryClient } = renderWithQueryClient(<DashboardPage />);

    // รอจนคำขอ 401 จบ (useUser คืน null ไม่ใช่ error) — heading ต้องยังเป็นข้อความทั่วไป ไม่มีชื่อผู้ใช้ต่อท้าย
    await waitFor(() => expect(queryClient.getQueryState(["auth", "user"])?.status).toBe("success"));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^ยินดีต้อนรับ$/);
  });
});
