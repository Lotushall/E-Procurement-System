import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useTenderProjectsList } from "@/lib/tender/tender-projects/queries/useTendersProjectList";
import { paginated } from "@/tests/fixtures/pagination";
import { makeTenderProject, makeTenderProjectStats } from "@/tests/fixtures/tender-projects";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tender-projects");

describe("useTenderProjectsList", () => {
  it("loads page 1 of 20 by default and caches under the list key", async () => {
    const rows = [makeTenderProject()];
    const stats = makeTenderProjectStats({ totalCount: 1 });
    let query: URLSearchParams | undefined;
    server.use(
      http.get(URL_, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated(rows, { stats }));
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useTenderProjectsList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual(rows);
    expect(result.current.data?.meta.stats).toEqual(stats);
    expect(Object.fromEntries(query!)).toEqual({ page: "1", per_page: "20" });
    expect(queryClient.getQueryData(["tenders_projects", "list", {}, 1, 20])).toEqual(result.current.data);
  });

  it("sends the params, page and page size and keys the cache by them", async () => {
    const params = { search: "คอม", status: "draft" as const, sort_by: "name" as const, sort_direction: "asc" as const };
    let query: URLSearchParams | undefined;
    server.use(
      http.get(URL_, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([], { currentPage: 2, perPage: 10, stats: makeTenderProjectStats() }));
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useTenderProjectsList(params, 2, 10));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(query!)).toEqual({
      search: "คอม",
      status: "draft",
      sort_by: "name",
      sort_direction: "asc",
      page: "2",
      per_page: "10",
    });
    expect(queryClient.getQueryState(["tenders_projects", "list", params, 2, 10])?.status).toBe("success");
  });

  it("reports an error on a 500", async () => {
    server.use(http.get(URL_, () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useTenderProjectsList());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
