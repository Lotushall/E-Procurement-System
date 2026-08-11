"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NotificationBody } from "@/components/notification-item";
import { useSelectNotification } from "@/lib/notification/useSelectNotification";
import type { NotificationItem } from "@/lib/notification/types";
import { NotificationPagination } from "./notification-pagination";

interface NotificationListProps {
  notifications: NotificationItem[];
  isLoading: boolean;
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

export function NotificationList({
  notifications,
  isLoading,
  currentPage,
  lastPage,
  onPageChange,
}: NotificationListProps) {
  const selectNotification = useSelectNotification();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือน</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            onClick={() => selectNotification(notification)}
            className={cn(
              "cursor-pointer flex-row items-start gap-3 p-4 transition-colors hover:bg-accent",
              notification.readAt === null && "bg-red-50/50",
            )}
          >
            <NotificationBody notification={notification} />
          </Card>
        ))}
      </div>

      <NotificationPagination currentPage={currentPage} lastPage={lastPage} onPageChange={onPageChange} />
    </div>
  );
}
