import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

// QueryClient ใหม่ทุก test — ไม่ retry เพื่อให้ error case จบทันที และไม่มี cache ข้าม test
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

export function renderWithQueryClient(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const queryClient = createTestQueryClient();
  return { queryClient, ...render(ui, { wrapper: createWrapper(queryClient), ...options }) };
}

export function renderHookWithQueryClient<Result>(hook: () => Result) {
  const queryClient = createTestQueryClient();
  return { queryClient, ...renderHook(hook, { wrapper: createWrapper(queryClient) }) };
}
