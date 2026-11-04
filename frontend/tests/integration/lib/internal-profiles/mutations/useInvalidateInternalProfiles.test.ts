import { describe, expect, it, vi } from "vitest";
import { useInvalidateInternalProfiles } from "@/lib/internal-profiles/mutations/useInvalidateInternalProfiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";

describe("useInvalidateInternalProfiles", () => {
  it("returns a function that invalidates every internal_profiles query", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidateInternalProfiles());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await result.current();

    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["internal_profiles"] });
  });

  it("marks cached internal_profiles queries stale and leaves other queries alone", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidateInternalProfiles());
    queryClient.setQueryData(["internal_profiles", "list"], [1]);
    queryClient.setQueryData(["unrelated"], [2]);

    await result.current();

    expect(queryClient.getQueryState(["internal_profiles", "list"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["unrelated"])?.isInvalidated).toBe(false);
  });
});
