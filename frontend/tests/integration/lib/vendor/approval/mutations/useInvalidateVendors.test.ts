import { describe, expect, it, vi } from "vitest";
import { useInvalidateVendors } from "@/lib/vendor/approval/mutations/useInvalidateVendors";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";

describe("useInvalidateVendors", () => {
  it("invalidates every query under the vendors key", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() => useInvalidateVendors());
    queryClient.setQueryData(["vendors", "list", {}, 1, 20], { stale: false });
    queryClient.setQueryData(["vendors", "detail", 3], { stale: false });
    queryClient.setQueryData(["tors", "list"], { stale: false });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await result.current();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
    expect(queryClient.getQueryState(["vendors", "list", {}, 1, 20])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["vendors", "detail", 3])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["tors", "list"])?.isInvalidated).toBe(false);
  });
});
