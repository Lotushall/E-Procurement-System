import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useApproveVendor } from "@/lib/vendor/approval/mutations/useApproveVendor";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL = apiUrl("/api/v1/vendors/4/approve");

describe("useApproveVendor", () => {
  it("posts the remark and invalidates vendors", async () => {
    let body: unknown;
    server.use(
      http.post(URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useApproveVendor(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync("ตรวจแล้ว"));

    expect(body).toEqual({ remark: "ตรวจแล้ว" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });

  it("still invalidates vendors when the request fails", async () => {
    server.use(http.post(URL, () => HttpResponse.json({ message: "ไม่ได้" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useApproveVendor(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(undefined)).rejects.toBeDefined();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });
});
