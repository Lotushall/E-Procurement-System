import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import {
  NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
  useUnreadNotificationCount,
} from "@/lib/notification/queries/useUnreadNotificationCount";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

describe("useUnreadNotificationCount", () => {
  it("exports the query key used for cache updates", () => {
    expect(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY).toEqual(["notifications", "unread-count"]);
  });

  it("returns the unread count and stores it under the key", async () => {
    server.use(
      http.get(apiUrl("/api/v1/notifications/unread-count"), () => HttpResponse.json({ data: { count: 4 } })),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useUnreadNotificationCount());

    await waitFor(() => expect(result.current.data).toBe(4));
    expect(queryClient.getQueryData(["notifications", "unread-count"])).toBe(4);
  });

  it("polls every 3 minutes and does not retry", async () => {
    server.use(
      http.get(apiUrl("/api/v1/notifications/unread-count"), () => HttpResponse.json({ data: { count: 0 } })),
    );

    const { result, queryClient } = renderHookWithQueryClient(() => useUnreadNotificationCount());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const options = queryClient.getQueryCache().find({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY })?.observers[0]
      ?.options;
    expect(options?.refetchInterval).toBe(180_000);
    expect(options?.retry).toBe(false);
  });

  it("surfaces an error state when the request fails", async () => {
    server.use(
      http.get(apiUrl("/api/v1/notifications/unread-count"), () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHookWithQueryClient(() => useUnreadNotificationCount());

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
