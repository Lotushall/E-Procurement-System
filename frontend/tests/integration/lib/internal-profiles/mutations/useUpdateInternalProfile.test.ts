import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useUpdateInternalProfile } from "@/lib/internal-profiles/mutations/useUpdateInternalProfile";
import { makeInternalProfile } from "@/tests/fixtures/internal-profiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/internal-profiles/:id");
const PAYLOAD = { firstname: "สมหญิง", lastname: "ใจดี" };

describe("useUpdateInternalProfile", () => {
  it("patches the row bound to the hook id, resolves with it and invalidates internal_profiles", async () => {
    let body: unknown;
    let id: unknown;
    const updated = makeInternalProfile({ id: 4 });
    server.use(
      http.patch(URL_, async ({ request, params }) => {
        body = await request.json();
        id = params.id;
        return HttpResponse.json({ data: updated });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateInternalProfile(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual(updated);
    });

    expect(id).toBe("4");
    expect(body).toEqual(PAYLOAD);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["internal_profiles"] });
  });

  it("still invalidates internal_profiles when the request fails", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({ message: "ผิดพลาด" }, { status: 500 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateInternalProfile(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["internal_profiles"] });
  });
});
