import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useUpdateDepartment } from "@/lib/internal-profiles/mutations/useUpdateDepartment";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/departments/:id");
const PAYLOAD = { name: "บัญชี" };

describe("useUpdateDepartment", () => {
  it("patches the row bound to the hook id, resolves with it and invalidates departments", async () => {
    let body: unknown;
    let id: unknown;
    const updated = makeDepartment({ id: 4 });
    server.use(
      http.patch(URL_, async ({ request, params }) => {
        body = await request.json();
        id = params.id;
        return HttpResponse.json({ data: updated });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateDepartment(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).resolves.toEqual(updated);
    });

    expect(id).toBe("4");
    expect(body).toEqual(PAYLOAD);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["departments"] });
  });

  it("still invalidates departments when the request fails", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({ message: "ผิดพลาด" }, { status: 500 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateDepartment(4));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(PAYLOAD)).rejects.toThrow();
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["departments"] });
  });
});
