import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { NotificationList } from "@/app/(public)/notifications/_components/notification-list";
import { routes } from "@/lib/routes";
import { makeNotification } from "@/tests/fixtures/notifications";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

freezeTimeAt("2026-11-02T10:00:00+07:00");

function renderList(props: Partial<React.ComponentProps<typeof NotificationList>> = {}) {
  const onPageChange = vi.fn();
  renderWithQueryClient(
    <NotificationList
      notifications={[]}
      isLoading={false}
      currentPage={1}
      lastPage={1}
      onPageChange={onPageChange}
      {...props}
    />,
  );
  return { onPageChange, user: userEvent.setup() };
}

describe("NotificationList", () => {
  it("shows skeletons while loading and no items or empty text", () => {
    const { container } = renderWithQueryClient(
      <NotificationList notifications={[makeNotification()]} isLoading currentPage={1} lastPage={1} onPageChange={vi.fn()} />,
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3);
    expect(screen.queryByText("เอกสารของคุณได้รับการอนุมัติ")).not.toBeInTheDocument();
    expect(screen.queryByText("ไม่มีการแจ้งเตือน")).not.toBeInTheDocument();
  });

  it("shows the empty message when there are no notifications", () => {
    renderList({ notifications: [] });

    expect(screen.getByText("ไม่มีการแจ้งเตือน")).toBeInTheDocument();
  });

  it("renders each message with its relative time", () => {
    renderList({
      notifications: [
        makeNotification({ id: "a", message: "เอกสารอนุมัติแล้ว", createdAt: "2026-11-02T09:00:00+07:00" }),
        makeNotification({ id: "b", message: "โปรไฟล์ถูกปฏิเสธ", type: "vendor_profile_rejected", createdAt: "2026-11-01T10:00:00+07:00" }),
      ],
    });

    expect(screen.getByText("เอกสารอนุมัติแล้ว")).toBeInTheDocument();
    expect(screen.getByText("โปรไฟล์ถูกปฏิเสธ")).toBeInTheDocument();
    expect(screen.getByText("ประมาณ 1 ชั่วโมงที่ผ่านมา")).toBeInTheDocument();
    expect(screen.getByText("1 วันที่ผ่านมา")).toBeInTheDocument();
  });

  it("clicking an unread item marks it read and navigates to its target", async () => {
    const ids: unknown[] = [];
    server.use(
      http.patch(apiUrl("/api/v1/notifications/:id/read"), ({ params }) => {
        ids.push(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderList({
      notifications: [makeNotification({ id: "n-5", message: "โปรไฟล์อนุมัติ", type: "vendor_profile_approved", readAt: null })],
    });

    await user.click(screen.getByText("โปรไฟล์อนุมัติ"));

    expect(router.push).toHaveBeenCalledWith(routes.profiles.profile);
    await waitFor(() => expect(ids).toEqual(["n-5"]));
  });

  it("clicking a read item only navigates", async () => {
    let called = false;
    server.use(
      http.patch(apiUrl("/api/v1/notifications/:id/read"), () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderList({
      notifications: [makeNotification({ message: "อ่านแล้ว", readAt: "2026-11-01T08:00:00.000Z" })],
    });

    await user.click(screen.getByText("อ่านแล้ว"));

    expect(router.push).toHaveBeenCalledWith(routes.profiles.document);
    expect(called).toBe(false);
  });

  it("renders pagination and forwards page changes", async () => {
    const { user, onPageChange } = renderList({
      notifications: [makeNotification()],
      currentPage: 2,
      lastPage: 3,
    });

    expect(screen.getByText("หน้า 2 จาก 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ถัดไป" }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
