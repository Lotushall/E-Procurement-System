import { useQuery } from "@tanstack/react-query";
import { fetchUnreadNotificationCount } from "@/lib/notification/api";

export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 3 * 60 * 1000,
    retry: false,
  });
}
