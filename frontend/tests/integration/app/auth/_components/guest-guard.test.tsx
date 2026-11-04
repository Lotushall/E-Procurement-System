import { screen, waitFor } from "@testing-library/react";
import { http } from "msw/http";
import { describe, expect, it } from "vitest";
import { GuestGuard } from "@/app/(auth)/_components/guest-guard";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

describe("GuestGuard", () => {
  it("renders nothing while the session is being checked", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));

    renderWithQueryClient(
      <GuestGuard>
        <p>หน้าเข้าสู่ระบบ</p>
      </GuestGuard>,
    );

    expect(screen.queryByText("หน้าเข้าสู่ระบบ")).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("renders the children for a signed-out visitor", async () => {
    signOut();

    renderWithQueryClient(
      <GuestGuard>
        <p>หน้าเข้าสู่ระบบ</p>
      </GuestGuard>,
    );

    expect(await screen.findByText("หน้าเข้าสู่ระบบ")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects a signed-in user home and never shows the children", async () => {
    signInAs();

    renderWithQueryClient(
      <GuestGuard>
        <p>หน้าเข้าสู่ระบบ</p>
      </GuestGuard>,
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("หน้าเข้าสู่ระบบ")).not.toBeInTheDocument();
  });
});
