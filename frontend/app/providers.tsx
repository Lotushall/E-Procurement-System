"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { setUnauthorizedHandler } from "@/lib/api";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // session หมดอายุ (API ตัวไหนก็ตามตอบ 401) — ล้าง user ทันที แล้ว guard ของแต่ละหน้าพาไป login เอง
  // ไม่ต้องรอ useUser refetch รอบถัดไป (ทุก 30 วินาที)
  useEffect(() => {
    setUnauthorizedHandler(() => queryClient.setQueryData(AUTH_USER_QUERY_KEY, null));
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* มุมซ้ายล่าง: มุมขวาล่างเป็นที่ของ ScrollToTop และปุ่มสร้างแบบลอยบนมือถือ */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
