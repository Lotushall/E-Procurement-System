import { screen } from "@testing-library/react";
import { http } from "msw/http";
import { describe, expect, it } from "vitest";
import { RequirePermission } from "@/lib/auth/guards/RequirePermission";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const FORBIDDEN = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้";

describe("RequirePermission", () => {
  it("shows a spinner while the user is loading", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));

    renderWithQueryClient(<RequirePermission permission="tors.viewAny">secret</RequirePermission>);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.queryByText(FORBIDDEN)).not.toBeInTheDocument();
  });

  it("shows Forbidden when signed out", async () => {
    signOut();

    renderWithQueryClient(<RequirePermission permission="tors.viewAny">secret</RequirePermission>);

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("shows Forbidden without the required permission", async () => {
    signInAs({ permissions: ["tors.create"] });

    renderWithQueryClient(<RequirePermission permission="tors.viewAny">secret</RequirePermission>);

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders children when the user has the permission", async () => {
    signInAs({ permissions: ["tors.viewAny"] });

    renderWithQueryClient(<RequirePermission permission="tors.viewAny">secret</RequirePermission>);

    expect(await screen.findByText("secret")).toBeInTheDocument();
    expect(screen.queryByText(FORBIDDEN)).not.toBeInTheDocument();
  });

  it("renders children when the user has any one of the permissions", async () => {
    signInAs({ permissions: ["tors.create"] });

    renderWithQueryClient(
      <RequirePermission permissions={["tors.viewAny", "tors.create"]}>secret</RequirePermission>,
    );

    expect(await screen.findByText("secret")).toBeInTheDocument();
  });

  it("shows Forbidden when the user has none of the permissions", async () => {
    signInAs({ permissions: ["users.viewAny"] });

    renderWithQueryClient(
      <RequirePermission permissions={["tors.viewAny", "tors.create"]}>secret</RequirePermission>,
    );

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
});
