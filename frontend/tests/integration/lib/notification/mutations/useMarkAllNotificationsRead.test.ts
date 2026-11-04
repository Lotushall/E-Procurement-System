import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useMarkAllNotificationsRead } from "@/lib/notification/mutations/useMarkAllNotificationsRead";
import type { PaginatedNotifications } from "@/lib/notification/types";
import { makeNotification } from "@/tests/fixtures/notifications";
import { paginated } from "@/tests/fixtures/pagination";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { apiUrl, server } from "@/tests/msw/server";

const READ_ALL_URL = apiUrl("/api/v1/notifications/read-all");
const LIST_KEY = ["notifications", "list", 1, 15];
const OTHER_LIST_KEY = ["notifications", "list", 2, 15];
const COUNT_KEY = ["notifications", "unread-count"];
const ALREADY_READ = "2026-11-01T08:00:00.000Z";

freezeTimeAt("2026-11-02T10:00:00+07:00");

function seed(queryClient: ReturnType<typeof renderHookWithQueryClient>["queryClient"]) {
  const list = paginated([
    makeNotification({ id: "n-1", readAt: null }),
    makeNotification({ id: "n-2", readAt: ALREADY_READ }),
  ]) as PaginatedNotifications;
  const other = paginated([makeNotification({ id: "n-3", readAt: null })]) as PaginatedNotifications;
  queryClient.setQueryData(LIST_KEY, list);
  queryClient.setQueryData(OTHER_LIST_KEY, other);
  queryClient.setQueryData(COUNT_KEY, 5);
  return { list, other };
}

function gatedHandler() {
  let release!: (status: number) => void;
  const gate = new Promise<number>((resolve) => {
    release = resolve;
  });
  server.use(
    http.patch(READ_ALL_URL, async () => {
      const status = await gate;
      return status >= 400 ? HttpResponse.json({ message: "boom" }, { status }) : new HttpResponse(null, { status });
    }),
  );
  return { release };
}

describe("useMarkAllNotificationsRead", () => {
  it("marks every unread item on every cached page and zeroes the count before the request resolves", async () => {
    const { release } = gatedHandler();
    const { result, queryClient } = renderHookWithQueryClient(() => useMarkAllNotificationsRead());
    seed(queryClient);
    const now = new Date("2026-11-02T10:00:00+07:00").toISOString();

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.mutateAsync();
    });

    await waitFor(() => expect(queryClient.getQueryData(COUNT_KEY)).toBe(0));
    const list = queryClient.getQueryData<PaginatedNotifications>(LIST_KEY)!;
    expect(list.data.map((n) => n.readAt)).toEqual([now, ALREADY_READ]);
    expect(queryClient.getQueryData<PaginatedNotifications>(OTHER_LIST_KEY)!.data[0].readAt).toBe(now);
    expect(result.current.isPending).toBe(true);

    release(204);
    await act(() => promise);
  });

  it("invalidates every notifications query once settled on success", async () => {
    server.use(http.patch(READ_ALL_URL, () => new HttpResponse(null, { status: 204 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useMarkAllNotificationsRead());
    seed(queryClient);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync());

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["notifications"] });
  });

  it("rolls the lists and the count back when the request fails, then invalidates", async () => {
    const { release } = gatedHandler();
    const { result, queryClient } = renderHookWithQueryClient(() => useMarkAllNotificationsRead());
    const { list, other } = seed(queryClient);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.mutateAsync().catch(() => undefined);
    });
    await waitFor(() => expect(queryClient.getQueryData(COUNT_KEY)).toBe(0));

    release(500);
    await act(() => promise);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(LIST_KEY)).toEqual(list);
    expect(queryClient.getQueryData(OTHER_LIST_KEY)).toEqual(other);
    expect(queryClient.getQueryData(COUNT_KEY)).toBe(5);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["notifications"] });
  });
});
