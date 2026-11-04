import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useTorsList } from "@/lib/tender/tor/queries/useTorsList";
import { paginated } from "@/tests/fixtures/pagination";
import { makeTor } from "@/tests/fixtures/tors";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/tors");

describe("useTorsList", () => {
  it("loads page 1 of 20 by default and caches under the list key", async () => {
    const rows = [makeTor()];
    let query: URLSearchParams | undefined;
    server.use(
      http.get(URL_, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated(rows));
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useTorsList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual(rows);
    expect(result.current.data?.meta).toEqual({ currentPage: 1, lastPage: 1, perPage: 20, total: 1 });
    expect(Object.fromEntries(query!)).toEqual({ page: "1", per_page: "20" });
    expect(queryClient.getQueryData(["tors", "list", {}, 1, 20])).toEqual(result.current.data);
  });

  it("sends the params, page and page size and keys the cache by them", async () => {
    const params = {
      search: "คอม",
      status: "draft" as const,
      tender_project_id: "none" as const,
      sort_by: "title" as const,
      sort_direction: "asc" as const,
    };
    let query: URLSearchParams | undefined;
    server.use(
      http.get(URL_, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(paginated([], { currentPage: 2, perPage: 10 }));
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useTorsList(params, 2, 10));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(query!)).toEqual({
      search: "คอม",
      status: "draft",
      tender_project_id: "none",
      sort_by: "title",
      sort_direction: "asc",
      page: "2",
      per_page: "10",
    });
    expect(queryClient.getQueryState(["tors", "list", params, 2, 10])?.status).toBe("success");
  });

  it("reports an error on a 500", async () => {
    server.use(http.get(URL_, () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useTorsList());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
