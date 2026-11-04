import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useTendersProjectDetail } from "@/lib/tender/tender-projects/queries/useTendersProjectDetail";
import { makeTenderProject } from "@/tests/fixtures/tender-projects";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tender-projects/:id");

describe("useTendersProjectDetail", () => {
  it("loads the project for the id and caches it under the detail key", async () => {
    const project = makeTenderProject({ id: 12 });
    const requested = vi.fn();
    server.use(
      http.get(URL_, ({ params }) => {
        requested(params.id);
        return HttpResponse.json({ data: project });
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useTendersProjectDetail(12));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(project);
    expect(requested).toHaveBeenCalledWith("12");
    expect(queryClient.getQueryData(["tenders_projects", "detail", 12])).toEqual(project);
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("makes no request when the id is %s", (_name, id) => {
    const requested = vi.fn();
    server.use(
      http.get(URL_, () => {
        requested();
        return HttpResponse.json({ data: makeTenderProject() });
      }),
    );

    const { result } = renderHookWithQueryClient(() => useTendersProjectDetail(id));

    expect(result.current.fetchStatus).toBe("idle");
    expect(requested).not.toHaveBeenCalled();
  });

  it("reports an error on a 404", async () => {
    server.use(http.get(URL_, () => new HttpResponse(null, { status: 404 })));

    const { result } = renderHookWithQueryClient(() => useTendersProjectDetail(99));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
