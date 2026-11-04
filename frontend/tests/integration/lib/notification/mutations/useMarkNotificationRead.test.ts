import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { useMarkNotificationRead } from "@/lib/notification/mutations/useMarkNotificationRead";
import type { PaginatedNotifications } from "@/lib/notification/types";
import { makeNotification } from "@/tests/fixtures/notifications";
import { paginated } from "@/tests/fixtures/pagination";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { apiUrl, server } from "@/tests/msw/server";

const READ_URL = apiUrl("/api/v1/notifications/:id/read");
const LIST_KEY = ["notifications", "list", 1, 15];
const OTHER_LIST_KEY = ["notifications", "list", 2, 15];
const COUNT_KEY = ["notifications", "unread-count"];

freezeTimeAt("2026-11-02T10:00:00+07:00");

function seed(queryClient: ReturnType<typeof renderHookWithQueryClient>["queryClient"], count = 3) {
  const list = paginated([
    makeNotification({ id: "n-1", readAt: null }),
    makeNotification({ id: "n-2", readAt: "2026-11-01T08:00:00.000Z" }),
  ]) as PaginatedNotifications;
  const other = paginated([makeNotification({ id: "n-3", readAt: null })]) as PaginatedNotifications;
  queryClient.setQueryData(LIST_KEY, list);
  queryClient.setQueryData(OTHER_LIST_KEY, other);
  queryClient.setQueryData(COUNT_KEY, count);
  return { list, other };
}

function gatedHandler() {
  let release!: (status: number) => void;
  const gate = new Promise<number>((resolve) => {
    release = resolve;
  });
  const ids: unknown[] = [];
  server.use(
    http.patch(READ_URL, async ({ params }) => {
      ids.push(params.id);
      const status = await gate;
      return status >= 400 ? HttpResponse.json({ message: "boom" }, { status }) : new HttpResponse(null, { status });
    }),
  );
  return { release, ids };
}

describe("useMarkNotificationRead", () => {
  it("marks the item read and decrements the count before the request resolves", async () => {
    const { release, ids } = gatedHandler();
    const { result, queryClient } = renderHookWithQueryClient(() => useMarkNotificationRead());
    seed(queryClient, 3);

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.mutateAsync("n-1");
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<PaginatedNotifications>(LIST_KEY)!;
      expect(cached.data[0].readAt).toBe(new Date("2026-11-02T10:00:00+07:00").toISOString());
    });
    expect(queryClient.getQueryData(COUNT_KEY)).toBe(2);
    // อีกรายการที่อ่านแล้วต้องไม่ถูกแตะ
    expect(queryClient.getQueryData<PaginatedNotifications>(LIST_KEY)!.data[1].readAt).toBe("2026-11-01T08:00:00.000Z");
    // หน้าอื่นที่ไม่มี id นี้ไม่เปลี่ยน
    expect(queryClient.getQueryData<PaginatedNotifications>(OTHER_LIST_KEY)!.data[0].readAt).toBeNull();
    expect(result.current.isPending).toBe(true);

    release(204);
    await act(() => promise);
    expect(ids).toEqual(["n-1"]);
  });

  it("does not change the count when the item was already read", async () => {
    const { release } = gatedHandler();
    const { result, queryClient } = renderHookWithQueryClient(() => useMarkNotificationRead());
    seed(queryClient, 3);

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.mutateAsync("n-2");
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));

    expect(queryClient.getQueryData(COUNT_KEY)).toBe(3);

    release(204);
    await act(() => promise);
  });

  it("never lets the count go below zero", async () => {
    const { release } = gatedHandler();
    const { result, queryClient } = renderHookWithQueryClient(() => useMarkNotificationRead());
    seed(queryClient, 0);

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.mutateAsync("n-1");
    });
    // รอจน onMutate ทำงานแล้ว (รายการถูกเปลี่ยนเป็นอ่านแล้ว) แล้วค่อยเช็คว่า count ไม่ติดลบ
    await waitFor(() =>
      expect(queryClient.getQueryData<PaginatedNotifications>(LIST_KEY)!.data[0].readAt).not.toBeNull(),
    );
    expect(queryClient.getQueryData(COUNT_KEY)).toBe(0);

    release(204);
    await act(() => promise);
  });

  it("invalidates every notifications query once settled on success", async () => {
    server.use(http.patch(READ_URL, () => new HttpResponse(null, { status: 204 })));
    const { result, queryClient } = renderHookWithQueryClient(() => useMarkNotificationRead());
    seed(queryClient);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await act(() => result.current.mutateAsync("n-1"));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["notifications"] });
  });

  it("rolls the lists and the count back when the request fails, then invalidates", async () => {
    const { release } = gatedHandler();
    const { result, queryClient } = renderHookWithQueryClient(() => useMarkNotificationRead());
    const { list, other } = seed(queryClient, 3);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    let promise!: Promise<void>;
    act(() => {
      promise = result.current.mutateAsync("n-1").catch(() => undefined);
    });
    await waitFor(() => expect(queryClient.getQueryData(COUNT_KEY)).toBe(2));

    release(500);
    await act(() => promise);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(LIST_KEY)).toEqual(list);
    expect(queryClient.getQueryData(OTHER_LIST_KEY)).toEqual(other);
    expect(queryClient.getQueryData(COUNT_KEY)).toBe(3);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["notifications"] });
  });
});
