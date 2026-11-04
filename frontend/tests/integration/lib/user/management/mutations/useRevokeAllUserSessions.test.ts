import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useRevokeAllUserSessions } from "@/lib/user/management/mutations/useRevokeAllUserSessions";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users/:id/sessions");

describe("useRevokeAllUserSessions", () => {
  it.each([
    ["keeping the current session", true, { keep_current: "1" }],
    ["revoking every session", false, {}],
  ])("requests the bound user's sessions %s and invalidates users", async (_name, keepCurrent, expectedQuery) => {
    const seen: { id: unknown; query: Record<string, string> }[] = [];
    server.use(
      http.delete(URL_, ({ params, request }) => {
        seen.push({ id: params.id, query: Object.fromEntries(new URL(request.url).searchParams) });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useRevokeAllUserSessions(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync(keepCurrent);
    });

    expect(seen).toEqual([{ id: "4", query: expectedQuery }]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("still invalidates users when the request fails", async () => {
    server.use(http.delete(URL_, () => HttpResponse.json({ message: "x" }, { status: 500 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useRevokeAllUserSessions(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(false)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });
});
