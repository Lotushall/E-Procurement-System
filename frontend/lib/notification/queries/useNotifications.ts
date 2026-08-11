import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/notification/api";

export function useNotifications(page: number, perPage: number) {
  return useQuery({
    queryKey: ["notifications", "list", page, perPage],
    queryFn: () => fetchNotifications(page, perPage),
    placeholderData: keepPreviousData,
  });
}
