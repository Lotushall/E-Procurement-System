import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useRejectVendorDocument } from "@/lib/vendor/approval/mutations/useRejectVendorDocument";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL = apiUrl("/api/v1/vendors/4/documents/:documentId/reject");

describe("useRejectVendorDocument", () => {
  it("rejects the given document with the remark and invalidates vendors", async () => {
    const rejected = vi.fn();
    server.use(
      http.post(URL, async ({ params, request }) => {
        rejected(params.documentId, await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useRejectVendorDocument(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync({ documentId: 21, remark: "ภาพไม่ชัด" }));

    expect(rejected).toHaveBeenCalledWith("21", { remark: "ภาพไม่ชัด" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });

  it("still invalidates vendors when the request fails", async () => {
    server.use(http.post(URL, () => new HttpResponse(null, { status: 500 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useRejectVendorDocument(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync({ documentId: 21, remark: "x" })).rejects.toBeDefined();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });
});
