import { waitFor } from "@testing-library/react";
import { http } from "msw/http";
import { describe, expect, it } from "vitest";
import { useRequireGuest } from "@/lib/auth/guards/useRequireGuest";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

describe("useRequireGuest", () => {
  it("is checking and does not redirect while the user request is pending", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));

    const { result } = renderHookWithQueryClient(() => useRequireGuest());

    expect(result.current.isChecking).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects a signed-in user to home and stays checking", async () => {
    signInAs();

    const { result } = renderHookWithQueryClient(() => useRequireGuest());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(result.current.isChecking).toBe(true);
  });

  it("stops checking and does not redirect when signed out", async () => {
    signOut();

    const { result } = renderHookWithQueryClient(() => useRequireGuest());

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
