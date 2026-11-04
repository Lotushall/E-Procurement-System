import { describe, expect, it, vi } from "vitest";
import { useInvalidatePositions } from "@/lib/internal-profiles/mutations/useInvalidatePositions";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";

describe("useInvalidatePositions", () => {
  it("returns a function that invalidates every positions query", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidatePositions());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await result.current();

    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["positions"] });
  });

  it("marks cached positions queries stale and leaves other queries alone", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidatePositions());
    queryClient.setQueryData(["positions", "list"], [1]);
    queryClient.setQueryData(["unrelated"], [2]);

    await result.current();

    expect(queryClient.getQueryState(["positions", "list"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["unrelated"])?.isInvalidated).toBe(false);
  });
});
