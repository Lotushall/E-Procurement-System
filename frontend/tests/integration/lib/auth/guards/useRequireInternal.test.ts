import { waitFor } from "@testing-library/react";
import { http } from "msw/http";
import { describe, expect, it } from "vitest";
import { useRequireInternal } from "@/lib/auth/guards/useRequireInternal";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

describe("useRequireInternal", () => {
  it("is checking and does not redirect while the user request is pending", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));

    const { result } = renderHookWithQueryClient(() => useRequireInternal());

    expect(result.current.isChecking).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("redirects to login when nobody is signed in", async () => {
    signOut();

    const { result } = renderHookWithQueryClient(() => useRequireInternal());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(result.current.isChecking).toBe(true);
  });

  it("authorizes an internal user without redirecting", async () => {
    signInAs({ userType: "internal" });

    const { result } = renderHookWithQueryClient(() => useRequireInternal());

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each(["company", "individual"] as const)(
    "redirects a %s user to the profile page and stays checking",
    async (userType) => {
      signInAs({ userType });

      const { result } = renderHookWithQueryClient(() => useRequireInternal());

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profiles"));
      expect(result.current.isChecking).toBe(true);
    },
  );
});
