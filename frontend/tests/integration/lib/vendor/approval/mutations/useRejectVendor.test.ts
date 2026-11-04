import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useRejectVendor } from "@/lib/vendor/approval/mutations/useRejectVendor";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL = apiUrl("/api/v1/vendors/4/reject");

describe("useRejectVendor", () => {
  it("posts the remark and invalidates vendors", async () => {
    let body: unknown;
    server.use(
      http.post(URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useRejectVendor(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync("เอกสารไม่ครบ"));

    expect(body).toEqual({ remark: "เอกสารไม่ครบ" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });

  it("still invalidates vendors when the request fails", async () => {
    server.use(http.post(URL, () => HttpResponse.json({ message: "ไม่ได้" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useRejectVendor(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync("x")).rejects.toBeDefined();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });
});
