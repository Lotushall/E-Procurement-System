import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useVendorList } from "@/lib/vendor/approval/queries/useVendorList";
import { makeVendorListItem } from "@/tests/fixtures/vendor-approval";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const META = {
  counts: { total: 1, pending: 1, approved: 0, rejected: 0 },
  current_page: 1,
  per_page: 20,
  total: 1,
  last_page: 1,
};

describe("useVendorList", () => {
  it("fetches the list with the params and caches under the vendors list key", async () => {
    let query: URLSearchParams | undefined;
    const vendor = makeVendorListItem();
    server.use(
      http.get(apiUrl("/api/v1/vendors"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ data: [vendor], meta: META });
      }),
    );
    const params = { status: "pending" as const };

    const { result, queryClient } = renderHookWithQueryClient(() => useVendorList(params, 3, 10));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(query!)).toEqual({ status: "pending", page: "3", per_page: "10" });
    expect(result.current.data?.vendors).toEqual([vendor]);
    expect(queryClient.getQueryData(["vendors", "list", params, 3, 10])).toEqual(result.current.data);
  });

  it("defaults to page 1 and 20 rows", async () => {
    let query: URLSearchParams | undefined;
    server.use(
      http.get(apiUrl("/api/v1/vendors"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json({ data: [], meta: META });
      }),
    );

    const { result } = renderHookWithQueryClient(() => useVendorList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Object.fromEntries(query!)).toEqual({ page: "1", per_page: "20" });
  });

  it("does not keep search results in the cache once unused (gcTime 0)", async () => {
    server.use(http.get(apiUrl("/api/v1/vendors"), () => HttpResponse.json({ data: [], meta: META })));

    const { result, queryClient } = renderHookWithQueryClient(() => useVendorList({ search: "abc" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: ["vendors", "list", { search: "abc" }, 1, 20] });
    expect(query?.gcTime).toBe(0);
  });

  it("uses the default gc time when there is no search", async () => {
    server.use(http.get(apiUrl("/api/v1/vendors"), () => HttpResponse.json({ data: [], meta: META })));

    const { result, queryClient } = renderHookWithQueryClient(() => useVendorList({ status: "approved" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: ["vendors", "list", { status: "approved" }, 1, 20] });
    expect(query?.gcTime).toBeGreaterThan(0);
  });

  it("keeps the previous page's data while the next page loads", async () => {
    const first = makeVendorListItem({ id: 1 });
    server.use(
      http.get(apiUrl("/api/v1/vendors"), ({ request }) => {
        if (new URL(request.url).searchParams.get("page") === "2") return new Promise<never>(() => {});
        return HttpResponse.json({ data: [first], meta: META });
      }),
    );
    let page = 1;

    const { result, rerender } = renderHookWithQueryClient(() => useVendorList({}, page));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    page = 2;
    rerender();

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data?.vendors).toEqual([first]);
  });

  it("reports an error on a failed request", async () => {
    server.use(http.get(apiUrl("/api/v1/vendors"), () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useVendorList());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
