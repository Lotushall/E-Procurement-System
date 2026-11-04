import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { usePendingVendor } from "@/lib/vendor/approval/mutations/usePendingVendor";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL = apiUrl("/api/v1/vendors/4/pending");

describe("usePendingVendor", () => {
  it("posts to the pending route and invalidates vendors", async () => {
    const posted = vi.fn();
    server.use(
      http.post(URL, () => {
        posted();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => usePendingVendor(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync());

    expect(posted).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });

  it("still invalidates vendors when the request fails", async () => {
    server.use(http.post(URL, () => new HttpResponse(null, { status: 500 })));
    const { result, queryClient } = renderHookWithQueryClient(() => usePendingVendor(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBeDefined();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });
});
