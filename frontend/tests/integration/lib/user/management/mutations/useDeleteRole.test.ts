import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import { useDeleteRole } from "@/lib/user/management/mutations/useDeleteRole";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/roles/:id");

describe("useDeleteRole", () => {
  it("deletes the role by id and invalidates users and the current user", async () => {
    const ids: unknown[] = [];
    server.use(
      http.delete(URL_, ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteRole());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync(3);
    });

    expect(ids).toEqual(["3"]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });

  it("still invalidates users and the current user when the request fails", async () => {
    server.use(http.delete(URL_, () => HttpResponse.json({ message: "ยังมีผู้ใช้" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteRole());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(3)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });
});
