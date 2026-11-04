import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useDeleteVendorContact } from "@/lib/vendor/profile/mutations/useDeleteVendorContact";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useDeleteVendorContact", () => {
  it("deletes the contact and invalidates the vendor profile", async () => {
    let path: string | undefined;
    server.use(
      http.delete(apiUrl("/api/v1/vendor/contact/:id"), ({ request }) => {
        path = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteVendorContact());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync(7));

    expect(path).toBe("/api/v1/vendor/contact/7");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendor", "profile"] });
  });

  it("does not invalidate when the delete fails", async () => {
    server.use(
      http.delete(apiUrl("/api/v1/vendor/contact/:id"), () => HttpResponse.json({ message: "no" }, { status: 422 })),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteVendorContact());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(7)).rejects.toThrow();
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
