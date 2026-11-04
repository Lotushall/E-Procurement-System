import { describe, expect, it, vi } from "vitest";
import { useInvalidateDepartments } from "@/lib/internal-profiles/mutations/useInvalidateDepartments";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";

describe("useInvalidateDepartments", () => {
  it("returns a function that invalidates every departments query", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidateDepartments());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await result.current();

    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: ["departments"] });
  });

  it("marks cached departments queries stale and leaves other queries alone", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidateDepartments());
    queryClient.setQueryData(["departments", "list"], [1]);
    queryClient.setQueryData(["unrelated"], [2]);

    await result.current();

    expect(queryClient.getQueryState(["departments", "list"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["unrelated"])?.isInvalidated).toBe(false);
  });
});
