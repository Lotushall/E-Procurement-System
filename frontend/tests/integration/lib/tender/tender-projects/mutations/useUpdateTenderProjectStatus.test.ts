import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useUpdateTenderProjectStatus } from "@/lib/tender/tender-projects/mutations/useUpdateTenderProjectStatus";
import { makeTenderProject } from "@/tests/fixtures/tender-projects";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tender-projects/:id/status");

describe("useUpdateTenderProjectStatus", () => {
  it("patches the hook's project id with the status, resolves with it and invalidates tenders_projects", async () => {
    let received: { id: unknown; body: unknown } | undefined;
    server.use(
      http.patch(URL_, async ({ params, request }) => {
        received = { id: params.id, body: await request.json() };
        return HttpResponse.json({ data: makeTenderProject({ id: 9, status: "published" }) });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateTenderProjectStatus(9));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync("published")).resolves.toBe("published");
    });

    expect(received).toEqual({ id: "9", body: { status: "published" } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });

  it("still invalidates tenders_projects when the request fails", async () => {
    server.use(http.patch(URL_, () => HttpResponse.json({ message: "เปลี่ยนไม่ได้" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useUpdateTenderProjectStatus(9));
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync("closed")).rejects.toMatchObject({ response: { status: 422 } });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });
});
