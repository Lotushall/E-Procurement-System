"use client";

import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { NOTIFICATION_META } from "@/lib/notification/utils";
import { useMarkNotificationRead } from "@/lib/notification/mutations/useMarkNotificationRead";
import type { NotificationItem } from "@/lib/notification/types";

function getErrorMessage(error: unknown): string {
  const message = isAxiosError(error)
    ? (error.response?.data as { message?: string } | undefined)?.message
    : undefined;
  return message ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export function useSelectNotification() {
  const router = useRouter();
  const markRead = useMarkNotificationRead();

  return function selectNotification(notification: NotificationItem): void {
    if (notification.readAt === null) {
      markRead.mutate(notification.id, {
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
    router.push(NOTIFICATION_META[notification.type].href);
  };
}
