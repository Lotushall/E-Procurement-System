import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead } from "@/lib/notification/api";
import { NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY } from "@/lib/notification/queries/useUnreadNotificationCount";
import type { PaginatedNotifications } from "@/lib/notification/types";

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousLists = queryClient.getQueriesData<PaginatedNotifications>({
        queryKey: ["notifications", "list"],
      });
      const previousCount = queryClient.getQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY);

      const now = new Date().toISOString();
      queryClient.setQueriesData<PaginatedNotifications>(
        { queryKey: ["notifications", "list"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) => (item.readAt === null ? { ...item, readAt: now } : item)),
          };
        },
      );
      queryClient.setQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, 0);

      return { previousLists, previousCount };
    },
    onError: (_error, _vars, context) => {
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context) {
        queryClient.setQueryData(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
