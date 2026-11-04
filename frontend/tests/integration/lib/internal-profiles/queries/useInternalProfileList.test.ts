import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useInternalProfileList } from "@/lib/internal-profiles/queries/useInternalProfileList";
import { makeInternalProfile } from "@/tests/fixtures/internal-profiles";
import { paginated } from "@/tests/fixtures/pagination";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/internal-profiles");

describe("useInternalProfileList", () => {
  it("loads page 1 of 20 by default and caches under the list key", async () => {
    const queries: URLSearchParams[] = [];
    const profile = makeInternalProfile();
    server.use(
      http.get(LIST_URL, ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(paginated([profile]));
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useInternalProfileList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(result.current.data).toEqual({
      data: [profile],
      meta: { currentPage: 1, lastPage: 1, perPage: 20, total: 1 },
    });
    expect(queryClient.getQueryData(["internal_profiles", "list", {}, 1, 20])).toEqual(result.current.data);
  });

  it("sends params, page and page size to the request", async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(LIST_URL, ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(paginated([]));
      }),
    );

    const { result } = renderHookWithQueryClient(() =>
      useInternalProfileList({ search: "ก", department_id: 2, sort_by: "department", sort_direction: "desc" }, 3, 50),
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(queries[0])).toEqual({
      search: "ก",
      department_id: "2",
      sort_by: "department",
      sort_direction: "desc",
      page: "3",
      per_page: "50",
    });
  });

  it("keeps the previous page while the next page loads", async () => {
    const first = makeInternalProfile({ id: 1, firstname: "หน้าแรก" });
    const second = makeInternalProfile({ id: 2, firstname: "หน้าสอง" });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(LIST_URL, async ({ request }) => {
        if (new URL(request.url).searchParams.get("page") === "2") {
          await gate;
          return HttpResponse.json(paginated([second], { currentPage: 2 }));
        }
        return HttpResponse.json(paginated([first]));
      }),
    );

    let page = 1;
    const { result, rerender } = renderHookWithQueryClient(() => useInternalProfileList({}, page));
    await waitFor(() => expect(result.current.data?.data).toEqual([first]));

    page = 2;
    rerender();

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.data).toEqual([first]);

    release();

    await waitFor(() => expect(result.current.data?.data).toEqual([second]));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("reports an error on a failed request", async () => {
    server.use(http.get(LIST_URL, () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useInternalProfileList());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
