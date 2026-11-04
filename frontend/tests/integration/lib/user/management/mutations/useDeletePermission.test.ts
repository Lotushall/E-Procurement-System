import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import { useDeletePermission } from "@/lib/user/management/mutations/useDeletePermission";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/permissions/:name");

describe("useDeletePermission", () => {
  it("deletes the permission by name and invalidates users and the current user", async () => {
    const names: unknown[] = [];
    server.use(
      http.delete(URL_, ({ params }) => {
        names.push(params.name);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeletePermission());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync("users.create");
    });

    expect(names).toEqual(["users.create"]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });

  it("still invalidates users and the current user when the request fails", async () => {
    server.use(http.delete(URL_, () => HttpResponse.json({ message: "x" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useDeletePermission());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync("users.create")).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });
});
