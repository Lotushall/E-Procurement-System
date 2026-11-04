import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import { useUpdateUser } from "@/lib/user/management/mutations/useUpdateUser";
import { makeUserDetail } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users/:id");
const PAYLOAD = { username: "renamed", email: "r@example.com" };

describe("useUpdateUser", () => {
  it("patches the bound user id, resolves with the updated user and invalidates users and the current user", async () => {
    let seen: { id: unknown; body: unknown } | undefined;
    const updated = makeUserDetail({ id: 9, username: "renamed" });
    server.use(
      http.patch(URL_, async ({ params, request }) => {
        seen = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: updated });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateUser(9));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual(updated);
    });

    expect(seen).toEqual({ id: "9", body: PAYLOAD });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });

  it("still invalidates users and the current user when the request fails", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({ message: "x" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateUser(9));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });
});
