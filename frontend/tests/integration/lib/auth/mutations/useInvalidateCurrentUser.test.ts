import { describe, expect, it, vi } from "vitest";
import { useInvalidateCurrentUser } from "@/lib/auth/mutations/useInvalidateCurrentUser";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";

describe("useInvalidateCurrentUser", () => {
  it("returns a function that invalidates the current-user query", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidateCurrentUser());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await result.current();

    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: AUTH_USER_QUERY_KEY });
  });

  it("marks the cached current user stale and leaves other queries alone", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidateCurrentUser());
    queryClient.setQueryData(AUTH_USER_QUERY_KEY, { id: 1 });
    queryClient.setQueryData(["users", "list"], [1]);

    await result.current();

    expect(queryClient.getQueryState(AUTH_USER_QUERY_KEY)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["users", "list"])?.isInvalidated).toBe(false);
  });
});
