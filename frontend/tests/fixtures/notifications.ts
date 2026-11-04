import type { NotificationItem } from "@/lib/notification/types";

// ชื่อ type จริงในซอร์สคือ NotificationItem (ไม่มี type ชื่อ Notification)
export function makeNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n-1",
    type: "vendor_document_approved",
    message: "เอกสารของคุณได้รับการอนุมัติ",
    readAt: null,
    createdAt: "2026-11-02T09:00:00+07:00",
    ...overrides,
  };
}
