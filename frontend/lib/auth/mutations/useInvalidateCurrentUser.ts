import { useQueryClient } from "@tanstack/react-query";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";

// ดึง user ปัจจุบันใหม่ — ใช้หลังแก้ role/permission เพื่อให้ guard เห็นสิทธิ์ใหม่ทันที ไม่ต้องรอรอบ poll
export function useInvalidateCurrentUser() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
}
