import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useCreateRole } from "@/lib/user/management/mutations/useCreateRole";
import { makeRole } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/roles");
const PAYLOAD = { name: "auditor", permissions: ["users.viewAny"] };

describe("useCreateRole", () => {
  it("posts the payload, resolves with the role and invalidates users", async () => {
    let body: unknown;
    const role = makeRole({ id: 8, ...PAYLOAD });
    server.use(
      http.post(URL_, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: role }, { status: 201 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateRole());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual(role);
    });

    expect(body).toEqual(PAYLOAD);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("still invalidates users when the request fails", async () => {
    server.use(http.post(URL_, () => HttpResponse.json({ message: "ซ้ำ" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useCreateRole());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });
});
