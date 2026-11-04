import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useRevokeUserSession } from "@/lib/user/management/mutations/useRevokeUserSession";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users/:id/sessions/:sessionId");

describe("useRevokeUserSession", () => {
  it("deletes the given session of the bound user and invalidates users", async () => {
    const seen: unknown[] = [];
    server.use(
      http.delete(URL_, ({ params }) => {
        seen.push(params);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useRevokeUserSession(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync("sess-1");
    });

    expect(seen).toEqual([{ id: "4", sessionId: "sess-1" }]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("still invalidates users when the request fails", async () => {
    server.use(http.delete(URL_, () => HttpResponse.json({ message: "x" }, { status: 404 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useRevokeUserSession(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync("sess-1")).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });
});
