import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useUserList } from "@/lib/user/management/queries/useUserList";
import { paginated } from "@/tests/fixtures/pagination";
import { makeManagedUser } from "@/tests/fixtures/user-management";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const URL_ = apiUrl("/api/v1/dashboard/users");

describe("useUserList", () => {
  it("loads the first page of 20 by default and caches under the list key", async () => {
    const queries: URLSearchParams[] = [];
    const rows = [makeManagedUser({ id: 1 }), makeManagedUser({ id: 2, username: "b" })];
    server.use(
      http.get(URL_, ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(paginated(rows));
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useUserList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual(rows);
    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(queryClient.getQueryData(["users", "list", {}, 1, 20])).toEqual(result.current.data);
  });

  it("passes params, page and per_page to the request", async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(URL_, ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(paginated([], { currentPage: 3 }));
      }),
    );

    const { result } = renderHookWithQueryClient(() => useUserList({ type: "internal", status: "active", search: "x" }, 3, 50));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(queries[0])).toEqual({ type: "internal", status: "active", search: "x", page: "3", per_page: "50" });
  });

  it("keeps the previous page's data visible while the next params load", async () => {
    const first = [makeManagedUser({ id: 1, username: "first" })];
    const second = [makeManagedUser({ id: 2, username: "second" })];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(URL_, async ({ request }) => {
        if (new URL(request.url).searchParams.get("search") === "b") {
          await gate;
          return HttpResponse.json(paginated(second));
        }
        return HttpResponse.json(paginated(first));
      }),
    );
    let search: string | undefined = undefined;
    const { result, rerender } = renderHookWithQueryClient(() => useUserList({ search }));
    await waitFor(() => expect(result.current.data?.data).toEqual(first));

    search = "b";
    rerender();

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.data).toEqual(first);
    release();
    await waitFor(() => expect(result.current.data?.data).toEqual(second));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("reports an error when the request fails", async () => {
    server.use(http.get(URL_, () => HttpResponse.json({ message: "boom" }, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useUserList());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
