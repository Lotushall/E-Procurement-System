import { waitFor } from "@testing-library/react";
import { http } from "msw/http";
import { describe, expect, it } from "vitest";
import { useRequireAuth } from "@/lib/auth/guards/useRequireAuth";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

describe("useRequireAuth", () => {
  it("is checking and does not redirect while the user request is pending", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));

    const { result } = renderHookWithQueryClient(() => useRequireAuth());

    expect(result.current.isChecking).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects to login once the check finds no user, and stays checking", async () => {
    signOut();

    const { result } = renderHookWithQueryClient(() => useRequireAuth());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(result.current.isChecking).toBe(true);
  });

  it("stops checking and does not redirect when signed in", async () => {
    signInAs();

    const { result } = renderHookWithQueryClient(() => useRequireAuth());

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
