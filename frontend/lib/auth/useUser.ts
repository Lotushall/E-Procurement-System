import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/lib/auth/api";

export const AUTH_USER_QUERY_KEY = ["auth", "user"] as const;

export function useUser() {
  return useQuery({
    queryKey: AUTH_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
