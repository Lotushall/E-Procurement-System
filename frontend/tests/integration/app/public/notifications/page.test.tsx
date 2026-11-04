import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import NotificationsPage from "@/app/(public)/notifications/page";
import { routes } from "@/lib/routes";
import { makeNotification } from "@/tests/fixtures/notifications";
import { paginated } from "@/tests/fixtures/pagination";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/notifications");
const COUNT_URL = apiUrl("/api/v1/notifications/unread-count");
const READ_ALL_URL = apiUrl("/api/v1/notifications/read-all");

freezeTimeAt("2026-11-02T10:00:00+07:00");

function mockList(body = paginated([makeNotification({ message: "เอกสารอนุมัติแล้ว" })])) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get(LIST_URL, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(body);
    }),
  );
  return queries;
}

function mockCount(count: number) {
  server.use(http.get(COUNT_URL, () => HttpResponse.json({ data: { count } })));
}

describe("NotificationsPage", () => {
  it("shows a spinner and redirects to login when not signed in", async () => {
    signOut();
    mockList();
    mockCount(0);

    renderWithQueryClient(<NotificationsPage />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(routes.auth.login));
    expect(screen.queryByRole("heading", { name: "การแจ้งเตือน" })).not.toBeInTheDocument();
  });

  it("requests page 1 with 15 per page by default and renders items with their time", async () => {
    signInAs();
    const queries = mockList(
      paginated([makeNotification({ message: "เอกสารอนุมัติแล้ว", createdAt: "2026-11-02T09:00:00+07:00" })]),
    );
    mockCount(0);

    renderWithQueryClient(<NotificationsPage />);

    expect(await screen.findByRole("heading", { name: "การแจ้งเตือน" })).toBeInTheDocument();
    expect(await screen.findByText("เอกสารอนุมัติแล้ว")).toBeInTheDocument();
    expect(screen.getByText("ประมาณ 1 ชั่วโมงที่ผ่านมา")).toBeInTheDocument();
    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "15" });
  });

  it("reads the page from ?page= and shows the pagination state", async () => {
    signInAs();
    setUrl("/notifications?page=3");
    const queries = mockList(paginated([makeNotification()], { currentPage: 3, lastPage: 5, perPage: 15 }));
    mockCount(0);

    renderWithQueryClient(<NotificationsPage />);

    expect(await screen.findByText("หน้า 3 จาก 5")).toBeInTheDocument();
    expect(queries[0].get("page")).toBe("3");
  });

  it.each(["abc", "0", "-2"])("falls back to page 1 for invalid ?page=%s", async (value) => {
    signInAs();
    setUrl(`/notifications?page=${value}`);
    const queries = mockList();
    mockCount(0);

    renderWithQueryClient(<NotificationsPage />);

    await screen.findByText("เอกสารอนุมัติแล้ว");
    expect(queries[0].get("page")).toBe("1");
  });

  it("navigates with router.replace when changing page and drops ?page= on page 1", async () => {
    signInAs();
    setUrl("/notifications?page=2&foo=bar");
    mockList(paginated([makeNotification()], { currentPage: 2, lastPage: 3, perPage: 15 }));
    mockCount(0);
    const user = userEvent.setup();

    renderWithQueryClient(<NotificationsPage />);
    await screen.findByText("หน้า 2 จาก 3");

    await user.click(screen.getByRole("button", { name: "ถัดไป" }));
    expect(router.replace).toHaveBeenLastCalledWith("/notifications?page=3&foo=bar", { scroll: false });

    await user.click(screen.getByRole("button", { name: "ก่อนหน้า" }));
    expect(router.replace).toHaveBeenLastCalledWith("/notifications?foo=bar", { scroll: false });
  });

  it("drops the whole query string when going back to page 1 with no other params", async () => {
    signInAs();
    setUrl("/notifications?page=2");
    mockList(paginated([makeNotification()], { currentPage: 2, lastPage: 3, perPage: 15 }));
    mockCount(0);
    const user = userEvent.setup();

    renderWithQueryClient(<NotificationsPage />);
    await screen.findByText("หน้า 2 จาก 3");
    await user.click(screen.getByRole("button", { name: "ก่อนหน้า" }));

    expect(router.replace).toHaveBeenLastCalledWith(routes.notifications, { scroll: false });
  });

  it("shows skeletons while the list is loading", async () => {
    signInAs();
    server.use(http.get(LIST_URL, () => new Promise(() => {})));
    mockCount(0);

    const { container } = renderWithQueryClient(<NotificationsPage />);

    await screen.findByRole("heading", { name: "การแจ้งเตือน" });
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
  });

  it("shows the empty state when there are no notifications", async () => {
    signInAs();
    mockList(paginated([]));
    mockCount(0);

    renderWithQueryClient(<NotificationsPage />);

    expect(await screen.findByText("ไม่มีการแจ้งเตือน")).toBeInTheDocument();
  });

  it("shows the error state and retries on demand", async () => {
    signInAs();
    mockCount(0);
    let failing = true;
    server.use(
      http.get(LIST_URL, () =>
        failing
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(paginated([makeNotification({ message: "กลับมาแล้ว" })])),
      ),
    );
    const user = userEvent.setup();

    renderWithQueryClient(<NotificationsPage />);
    expect(await screen.findByText("โหลดข้อมูลไม่สำเร็จ")).toBeInTheDocument();

    failing = false;
    await user.click(screen.getByRole("button", { name: "ลองใหม่" }));

    expect(await screen.findByText("กลับมาแล้ว")).toBeInTheDocument();
    expect(screen.queryByText("โหลดข้อมูลไม่สำเร็จ")).not.toBeInTheDocument();
  });

  it("hides the mark-all button when nothing is unread", async () => {
    signInAs();
    mockList();
    mockCount(0);

    renderWithQueryClient(<NotificationsPage />);
    await screen.findByText("เอกสารอนุมัติแล้ว");

    expect(screen.queryByRole("button", { name: "อ่านทั้งหมด" })).not.toBeInTheDocument();
  });

  it("marks everything read when the mark-all button is pressed", async () => {
    signInAs();
    mockList();
    mockCount(2);
    const called = vi.fn();
    server.use(
      http.patch(READ_ALL_URL, () => {
        called();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();

    renderWithQueryClient(<NotificationsPage />);
    await user.click(await screen.findByRole("button", { name: "อ่านทั้งหมด" }));

    await waitFor(() => expect(called).toHaveBeenCalledOnce());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows the backend message in a toast when mark-all fails", async () => {
    signInAs();
    mockList();
    mockCount(2);
    server.use(http.patch(READ_ALL_URL, () => HttpResponse.json({ message: "ล้มเหลว" }, { status: 500 })));
    const user = userEvent.setup();

    renderWithQueryClient(<NotificationsPage />);
    await user.click(await screen.findByRole("button", { name: "อ่านทั้งหมด" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ล้มเหลว"));
  });
});
