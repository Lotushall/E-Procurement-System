import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useDeleteVendorDocument } from "@/lib/vendor/profile/mutations/useDeleteVendorDocument";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useDeleteVendorDocument", () => {
  it("deletes the document and invalidates the vendor profile", async () => {
    let path: string | undefined;
    server.use(
      http.delete(apiUrl("/api/v1/vendor/document/:id"), ({ request }) => {
        path = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteVendorDocument());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync(5));

    expect(path).toBe("/api/v1/vendor/document/5");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendor", "profile"] });
  });

  it("does not invalidate when the delete fails", async () => {
    server.use(
      http.delete(apiUrl("/api/v1/vendor/document/:id"), () => HttpResponse.json({ message: "no" }, { status: 422 })),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteVendorDocument());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(5)).rejects.toThrow();
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
