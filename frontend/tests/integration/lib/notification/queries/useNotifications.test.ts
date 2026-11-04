import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { useNotifications } from "@/lib/notification/queries/useNotifications";
import { makeNotification } from "@/tests/fixtures/notifications";
import { paginated } from "@/tests/fixtures/pagination";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useNotifications", () => {
  it("fetches the requested page and caches it under the list key", async () => {
    let query: URLSearchParams | undefined;
    const body = paginated([makeNotification()], { currentPage: 3, lastPage: 5, perPage: 10, total: 42 });
    server.use(
      http.get(apiUrl("/api/v1/notifications"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(body);
      }),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useNotifications(3, 10));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(body);
    expect(Object.fromEntries(query!)).toEqual({ page: "3", per_page: "10" });
    expect(queryClient.getQueryData(["notifications", "list", 3, 10])).toEqual(body);
  });

  it("keeps the previous page's data while the next page loads", async () => {
    const page1 = paginated([makeNotification({ id: "a" })], { currentPage: 1, lastPage: 2 });
    const page2 = paginated([makeNotification({ id: "b" })], { currentPage: 2, lastPage: 2 });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(apiUrl("/api/v1/notifications"), async ({ request }) => {
        const page = new URL(request.url).searchParams.get("page");
        if (page === "2") {
          await gate;
          return HttpResponse.json(page2);
        }
        return HttpResponse.json(page1);
      }),
    );

    let page = 1;
    const { result, rerender } = renderHookWithQueryClient(() => useNotifications(page, 15));
    await waitFor(() => expect(result.current.data).toEqual(page1));

    page = 2;
    rerender();

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data).toEqual(page1);

    release();
    await waitFor(() => expect(result.current.data).toEqual(page2));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("surfaces an error state when the request fails", async () => {
    server.use(http.get(apiUrl("/api/v1/notifications"), () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHookWithQueryClient(() => useNotifications(1, 15));

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
