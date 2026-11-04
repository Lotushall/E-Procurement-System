import { act } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useDeleteTenderProject } from "@/lib/tender/tender-projects/mutations/useDeleteTenderProject";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tender-projects/:id");

describe("useDeleteTenderProject", () => {
  it("deletes the project by id and invalidates tenders_projects", async () => {
    let id: unknown;
    server.use(
      http.delete(URL_, ({ params }) => {
        id = params.id;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteTenderProject());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(7)).resolves.toBeUndefined();
    });

    expect(id).toBe("7");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });

  it("still invalidates tenders_projects when the request fails", async () => {
    server.use(http.delete(URL_, () => HttpResponse.json({ message: "ลบไม่ได้" }, { status: 422 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useDeleteTenderProject());
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await expect(result.current.mutateAsync(7)).rejects.toMatchObject({ response: { status: 422 } });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["tenders_projects"] });
  });
});
