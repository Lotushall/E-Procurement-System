import { vi } from "vitest";

// แทน next/navigation ทั้ง module (ผูกไว้ใน tests/setup.ts) — test กำหนด URL ปัจจุบันเองแล้วเช็คว่า router ถูกเรียกด้วยอะไร
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

let pathname = "/";
let searchParams = new URLSearchParams();
let params: Record<string, string> = {};

// ตั้ง URL ก่อน render เช่น setUrl("/dashboard/tors?status=draft&page=2")
export function setUrl(url: string) {
  const parsed = new URL(url, "http://localhost:3000");
  pathname = parsed.pathname;
  searchParams = new URLSearchParams(parsed.search);
}

export function setParams(next: Record<string, string>) {
  params = next;
}

export function resetNavigation() {
  Object.values(router).forEach((fn) => fn.mockReset());
  pathname = "/";
  searchParams = new URLSearchParams();
  params = {};
}

export const useRouter = () => router;
export const usePathname = () => pathname;
export const useSearchParams = () => searchParams;
export const useParams = () => params;
export const redirect = vi.fn();
export const notFound = vi.fn();
