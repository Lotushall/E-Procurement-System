import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import { useUpdateRole } from "@/lib/user/management/mutations/useUpdateRole";
import { makeRole } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/roles/:id");
const PAYLOAD = { name: "auditor2", permissions: ["users.create"] };

describe("useUpdateRole", () => {
  it("patches the bound role id, resolves with the role and invalidates users and the current user", async () => {
    let seen: { id: unknown; body: unknown } | undefined;
    const role = makeRole({ id: 8, ...PAYLOAD });
    server.use(
      http.patch(URL_, async ({ params, request }) => {
        seen = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: role });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateRole(8));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual(role);
    });

    expect(seen).toEqual({ id: "8", body: PAYLOAD });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });

  it("still invalidates users and the current user when the request fails", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({ message: "x" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateRole(8));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });
});
