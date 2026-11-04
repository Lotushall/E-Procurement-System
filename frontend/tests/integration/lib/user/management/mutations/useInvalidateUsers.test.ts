import { describe, expect, it, vi } from "vitest";
import { useInvalidateUsers } from "@/lib/user/management/mutations/useInvalidateUsers";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";

describe("useInvalidateUsers", () => {
  it("returns a function that invalidates every users query", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidateUsers());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await result.current();

    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["users"] });
  });

  it("marks cached users queries stale and leaves other queries alone", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidateUsers());
    queryClient.setQueryData(["users", "list", {}, 1, 20], [1]);
    queryClient.setQueryData(["users", "detail", 5], [2]);
    queryClient.setQueryData(["users", "roles"], [3]);
    queryClient.setQueryData(["internal_profiles", "list"], [4]);

    await result.current();

    expect(queryClient.getQueryState(["users", "list", {}, 1, 20])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["users", "detail", 5])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["users", "roles"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["internal_profiles", "list"])?.isInvalidated).toBe(false);
  });
});
