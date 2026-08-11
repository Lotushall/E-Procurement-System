import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationRead } from "@/lib/notification/api";
import { NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY } from "@/lib/notification/queries/useUnreadNotificationCount";
import type { PaginatedNotifications } from "@/lib/notification/types";

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousLists = queryClient.getQueriesData<PaginatedNotifications>({
        queryKey: ["notifications", "list"],
      });
      const previousCount = queryClient.getQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY);

      let wasUnread = false;
      queryClient.setQueriesData<PaginatedNotifications>(
        { queryKey: ["notifications", "list"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) => {
              if (item.id !== id) return item;
              if (item.readAt === null) wasUnread = true;
              return { ...item, readAt: new Date().toISOString() };
            }),
          };
        },
      );

      if (wasUnread) {
        queryClient.setQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, (old) =>
          Math.max(0, (old ?? 1) - 1),
        );
      }

      return { previousLists, previousCount };
    },
    onError: (_error, _id, context) => {
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
