import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useDeleteVendor } from "@/lib/vendor/approval/mutations/useDeleteVendor";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL = apiUrl("/api/v1/vendors/:id");

describe("useDeleteVendor", () => {
  it("deletes the vendor by id and invalidates vendors", async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(URL, ({ params }) => {
        deleted(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteVendor());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync(9));

    expect(deleted).toHaveBeenCalledWith("9");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });

  it("still invalidates vendors when the request fails", async () => {
    server.use(http.delete(URL, () => new HttpResponse(null, { status: 500 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteVendor());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(9)).rejects.toBeDefined();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["vendors"] });
  });
});
