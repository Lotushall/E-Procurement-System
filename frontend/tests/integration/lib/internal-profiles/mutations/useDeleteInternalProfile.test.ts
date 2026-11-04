import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useDeleteInternalProfile } from "@/lib/internal-profiles/mutations/useDeleteInternalProfile";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/internal-profiles/:id");

describe("useDeleteInternalProfile", () => {
  it("deletes the row by id and invalidates internal_profiles", async () => {
    let id: unknown;
    server.use(
      http.delete(URL_, ({ params }) => {
        id = params.id;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteInternalProfile());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync(6);
    });

    expect(id).toBe("6");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["internal_profiles"] });
  });

  it("still invalidates internal_profiles when the request fails", async () => {
    server.use(http.delete(URL_, () => HttpResponse.json({ message: "ลบไม่ได้" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteInternalProfile());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(6)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["internal_profiles"] });
  });
});
