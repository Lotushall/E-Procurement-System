import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import { useUpdatePermission } from "@/lib/user/management/mutations/useUpdatePermission";
import { makePermission } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/permissions/:name");
const PAYLOAD = { name: "users.create", label: "สร้างผู้ใช้ใหม่" };

describe("useUpdatePermission", () => {
  it("patches the bound permission name, resolves with it and invalidates users and the current user", async () => {
    let seen: { name: unknown; body: unknown } | undefined;
    const permission = makePermission(PAYLOAD);
    server.use(
      http.patch(URL_, async ({ params, request }) => {
        seen = { name: params.name, body: await request.json() };
        return HttpResponse.json({ data: permission });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdatePermission("users.create"));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual(permission);
    });

    expect(seen).toEqual({ name: "users.create", body: PAYLOAD });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });

  it("still invalidates users and the current user when the request fails", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({ message: "x" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdatePermission("users.create"));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_USER_QUERY_KEY });
  });
});
