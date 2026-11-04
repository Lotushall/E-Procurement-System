import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification/api";
import { makeNotification } from "@/tests/fixtures/notifications";
import { paginated } from "@/tests/fixtures/pagination";
import { apiUrl, server } from "@/tests/msw/server";

describe("fetchNotifications", () => {
  it("sends page and per_page and returns the paginated body as-is", async () => {
    let query: URLSearchParams | undefined;
    const body = paginated([makeNotification()], { currentPage: 2, lastPage: 4, perPage: 15, total: 50 });
    server.use(
      http.get(apiUrl("/api/v1/notifications"), ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(body);
      }),
    );

    const result = await fetchNotifications(2, 15);

    expect(Object.fromEntries(query!)).toEqual({ page: "2", per_page: "15" });
    expect(result).toEqual(body);
  });
});

describe("fetchUnreadNotificationCount", () => {
  it("unwraps the count from data.data.count", async () => {
    server.use(
      http.get(apiUrl("/api/v1/notifications/unread-count"), () => HttpResponse.json({ data: { count: 7 } })),
    );

    await expect(fetchUnreadNotificationCount()).resolves.toBe(7);
  });
});

describe("markNotificationRead", () => {
  it("PATCHes the read endpoint for the given id", async () => {
    let seen: { id?: string | readonly string[]; method?: string } = {};
    server.use(
      http.patch(apiUrl("/api/v1/notifications/:id/read"), ({ params, request }) => {
        seen = { id: params.id, method: request.method };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(markNotificationRead("abc-123")).resolves.toBeUndefined();
    expect(seen).toEqual({ id: "abc-123", method: "PATCH" });
  });
});

describe("markAllNotificationsRead", () => {
  it("PATCHes read-all", async () => {
    let method: string | undefined;
    server.use(
      http.patch(apiUrl("/api/v1/notifications/read-all"), ({ request }) => {
        method = request.method;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(markAllNotificationsRead()).resolves.toBeUndefined();
    expect(method).toBe("PATCH");
  });
});
