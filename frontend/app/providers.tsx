"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { setForbiddenHandler, setUnauthorizedHandler } from "@/lib/api";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // session หมดอายุ (API ตัวไหนก็ตามตอบ 401) — ล้าง user ทันที แล้ว guard ของแต่ละหน้าพาไป login เอง
  // ไม่ต้องรอ useUser refetch รอบถัดไป (ทุก 30 วินาที)
  // สิทธิ์ถูกถอด (API ตอบ 403) — ดึง user ใหม่ทันที guard จะเห็นสิทธิ์ล่าสุดแล้วซ่อนหน้าที่ไม่มีสิทธิ์เอง
  useEffect(() => {
    setUnauthorizedHandler(() => queryClient.setQueryData(AUTH_USER_QUERY_KEY, null));
    setForbiddenHandler(() => queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY }));
    return () => {
      setUnauthorizedHandler(null);
      setForbiddenHandler(null);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* มุมซ้ายล่าง: มุมขวาล่างเป็นที่ของ ScrollToTop และปุ่มสร้างแบบลอยบนมือถือ */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
