import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { usePendingVendorDocument } from "@/lib/vendor/approval/mutations/usePendingVendorDocument";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL = apiUrl("/api/v1/vendors/4/documents/:documentId/pending");

describe("usePendingVendorDocument", () => {
  it("sets the given document back to pending and invalidates vendors", async () => {
    const pending = vi.fn();
    server.use(
      http.post(URL, ({ params }) => {
        pending(params.documentId);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => usePendingVendorDocument(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync(21));

    expect(pending).toHaveBeenCalledWith("21");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });

  it("still invalidates vendors when the request fails", async () => {
    server.use(http.post(URL, () => new HttpResponse(null, { status: 500 })));
    const { result, queryClient } = renderHookWithQueryClient(() => usePendingVendorDocument(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(21)).rejects.toBeDefined();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });
});
