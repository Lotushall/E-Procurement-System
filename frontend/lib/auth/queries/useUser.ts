import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/lib/auth/api";

export const AUTH_USER_QUERY_KEY = ["auth", "user"] as const;

export function useUser() {
  return useQuery({
    queryKey: AUTH_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    // เท่ากับรอบ poll — กลับมาที่แท็บหลังเกิน 30 วินาทีจะดึงสิทธิ์ล่าสุดทันที (poll หยุดตอนแท็บอยู่เบื้องหลัง)
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}
