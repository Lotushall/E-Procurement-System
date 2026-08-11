// These four endpoints are a designed-but-not-yet-implemented backend contract.
// See docs/superpowers/specs/2026-08-11-notification-center-design.md.
// Requests will fail until the backend read-side API plan ships.
import { api } from "@/lib/api";
import type { PaginatedNotifications } from "@/lib/notification/types";

export async function fetchNotifications(
  page: number,
  perPage: number,
): Promise<PaginatedNotifications> {
  const { data } = await api.get<PaginatedNotifications>("/api/v1/notifications", {
    params: { page, per_page: perPage },
  });
  return data;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get<{ data: { count: number } }>(
    "/api/v1/notifications/unread-count",
  );
  return data.data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/v1/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/api/v1/notifications/read-all");
}
