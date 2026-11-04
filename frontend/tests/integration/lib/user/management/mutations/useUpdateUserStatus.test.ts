import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useUpdateUserStatus } from "@/lib/user/management/mutations/useUpdateUserStatus";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users/:id/status");

describe("useUpdateUserStatus", () => {
  it("patches the bound user's status, resolves with it and invalidates users", async () => {
    let seen: { id: unknown; body: unknown } | undefined;
    server.use(
      http.patch(URL_, async ({ params, request }) => {
        seen = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: { status: "suspended" } });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateUserStatus(6));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync("suspended")).resolves.toBe("suspended");
    });

    expect(seen).toEqual({ id: "6", body: { status: "suspended" } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("still invalidates users when the request fails", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({ message: "x" }, { status: 403 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateUserStatus(6));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync("active")).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });
});
