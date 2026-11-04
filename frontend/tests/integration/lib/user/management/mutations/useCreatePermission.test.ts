import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useCreatePermission } from "@/lib/user/management/mutations/useCreatePermission";
import { makePermission } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/permissions");
const PAYLOAD = { name: "reports.view", label: "ดูรายงาน" };

describe("useCreatePermission", () => {
  it("posts the payload, resolves with the permission and invalidates users", async () => {
    let body: unknown;
    const permission = makePermission({ ...PAYLOAD, group: "reports" });
    server.use(
      http.post(URL_, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: permission }, { status: 201 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useCreatePermission());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual(permission);
    });

    expect(body).toEqual(PAYLOAD);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });

  it("still invalidates users when the request fails", async () => {
    server.use(http.post(URL_, () => HttpResponse.json({ message: "ซ้ำ" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useCreatePermission());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] });
  });
});
