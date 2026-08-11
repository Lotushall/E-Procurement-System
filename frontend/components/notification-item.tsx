import { cn } from "@/lib/utils";
import { getNotificationMeta, formatNotificationTime } from "@/lib/notification/utils";
import type { NotificationItem } from "@/lib/notification/types";

export function NotificationBody({ notification }: { notification: NotificationItem }) {
  const meta = getNotificationMeta(notification.type);
  const Icon = meta.icon;

  return (
    <>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          meta.tone === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="text-sm font-medium leading-tight">{notification.message}</p>
        <p className="text-xs text-muted-foreground">{formatNotificationTime(notification.createdAt)}</p>
      </div>
    </>
  );
}
