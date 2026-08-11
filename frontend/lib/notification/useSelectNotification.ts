"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getNotificationMeta } from "@/lib/notification/utils";
import { useMarkNotificationRead } from "@/lib/notification/mutations/useMarkNotificationRead";
import { getErrorMessage } from "@/lib/api-error";
import type { NotificationItem } from "@/lib/notification/types";

export function useSelectNotification() {
  const router = useRouter();
  const markRead = useMarkNotificationRead();

  return function selectNotification(notification: NotificationItem): void {
    if (notification.readAt === null) {
      markRead.mutate(notification.id, {
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
    router.push(getNotificationMeta(notification.type).href);
  };
}
