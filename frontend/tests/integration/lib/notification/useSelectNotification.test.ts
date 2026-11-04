import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import { useSelectNotification } from "@/lib/notification/useSelectNotification";
import { routes } from "@/lib/routes";
import { makeNotification } from "@/tests/fixtures/notifications";
import { renderHookWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const READ_URL = apiUrl("/api/v1/notifications/:id/read");

describe("useSelectNotification", () => {
  it("marks an unread notification read and navigates to its target", async () => {
    const ids: unknown[] = [];
    server.use(
      http.patch(READ_URL, ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useSelectNotification());

    act(() => result.current(makeNotification({ id: "n-9", type: "vendor_profile_rejected", readAt: null })));

    expect(router.push).toHaveBeenCalledWith(routes.profiles.profile);
    await waitFor(() => expect(ids).toEqual(["n-9"]));
  });

  it("navigates to the document page for document notifications", async () => {
    const ids: unknown[] = [];
    server.use(
      http.patch(READ_URL, ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useSelectNotification());

    act(() => result.current(makeNotification({ type: "vendor_document_approved", readAt: null })));

    expect(router.push).toHaveBeenCalledWith(routes.profiles.document);
    await waitFor(() => expect(ids).toEqual(["n-1"]));
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("only navigates, without any request, when the notification is already read", () => {
    let called = false;
    server.use(
      http.patch(READ_URL, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { result } = renderHookWithQueryClient(() => useSelectNotification());

    act(() =>
      result.current(makeNotification({ type: "vendor_document_rejected", readAt: "2026-11-01T08:00:00.000Z" })),
    );

    expect(router.push).toHaveBeenCalledWith(routes.profiles.document);
    expect(called).toBe(false);
  });

  it("still navigates and shows the backend message when marking read fails", async () => {
    server.use(http.patch(READ_URL, () => HttpResponse.json({ message: "ทำรายการไม่ได้" }, { status: 500 })));
    const { result } = renderHookWithQueryClient(() => useSelectNotification());

    act(() => result.current(makeNotification({ readAt: null })));

    expect(router.push).toHaveBeenCalledOnce();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ทำรายการไม่ได้"));
  });

  it("falls back to the generic message when the failure has no backend message", async () => {
    server.use(http.patch(READ_URL, () => new HttpResponse(null, { status: 500 })));
    const { result } = renderHookWithQueryClient(() => useSelectNotification());

    act(() => result.current(makeNotification({ readAt: null })));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  });
});
