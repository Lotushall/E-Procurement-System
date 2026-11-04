import { screen } from "@testing-library/react";
import { http } from "msw/http";
import { describe, expect, it } from "vitest";
import { RequireRole } from "@/lib/auth/guards/RequireRole";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const FORBIDDEN = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้";

describe("RequireRole", () => {
  it("shows a spinner while the user is loading", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));

    renderWithQueryClient(<RequireRole role="admin">secret</RequireRole>);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.queryByText(FORBIDDEN)).not.toBeInTheDocument();
  });

  it("shows Forbidden when signed out", async () => {
    signOut();

    renderWithQueryClient(<RequireRole role="admin">secret</RequireRole>);

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("shows Forbidden without the role", async () => {
    signInAs({ roles: ["officer"] });

    renderWithQueryClient(<RequireRole role="admin">secret</RequireRole>);

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders children when the user has the role", async () => {
    signInAs({ roles: ["admin"] });

    renderWithQueryClient(<RequireRole role="admin">secret</RequireRole>);

    expect(await screen.findByText("secret")).toBeInTheDocument();
    expect(screen.queryByText(FORBIDDEN)).not.toBeInTheDocument();
  });
});
