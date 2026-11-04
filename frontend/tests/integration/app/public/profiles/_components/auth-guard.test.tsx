import { screen, waitFor } from "@testing-library/react";
import { http } from "msw/http";
import { describe, expect, it } from "vitest";
import { AuthGuard } from "@/app/(public)/profiles/_components/auth-guard";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

describe("AuthGuard", () => {
  it("shows a skeleton and hides children while the session is being checked", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise(() => {})));
    const { container } = renderWithQueryClient(
      <AuthGuard>
        <p>เนื้อหาโปรไฟล์</p>
      </AuthGuard>,
    );

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByText("เนื้อหาโปรไฟล์")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects a signed-out visitor to login and keeps children hidden", async () => {
    signOut();
    renderWithQueryClient(
      <AuthGuard>
        <p>เนื้อหาโปรไฟล์</p>
      </AuthGuard>,
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("เนื้อหาโปรไฟล์")).not.toBeInTheDocument();
  });

  it("renders children for a signed-in vendor", async () => {
    signInAs({ userType: "company" });
    renderWithQueryClient(
      <AuthGuard>
        <p>เนื้อหาโปรไฟล์</p>
      </AuthGuard>,
    );

    expect(await screen.findByText("เนื้อหาโปรไฟล์")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("renders children for an internal user too (the guard only checks sign-in)", async () => {
    signInAs({ userType: "internal" });
    renderWithQueryClient(
      <AuthGuard>
        <p>เนื้อหาโปรไฟล์</p>
      </AuthGuard>,
    );

    expect(await screen.findByText("เนื้อหาโปรไฟล์")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
