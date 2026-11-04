import { routes } from "@/lib/routes";

const REDIRECT_PARAM = "redirect";

// รับเฉพาะ path ภายในเว็บ ("/..." แต่ไม่ใช่ "//host" หรือ "/\host") กัน open redirect ไปเว็บอื่น
export function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

// URL หน้า login ที่จำหน้าปัจจุบันไว้ (session หมดอายุ / เปิดหน้าที่ต้อง login) — login เสร็จจะกลับมาหน้านี้
// อ่านจาก window.location ใน effect เลยไม่ต้องใช้ useSearchParams (ซึ่งต้องมี Suspense ครอบ)
export function loginUrlForCurrentPage(): string {
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === routes.home) return routes.auth.login;
  return `${routes.auth.login}?${new URLSearchParams({ [REDIRECT_PARAM]: current })}`;
}

// หน้าที่จะไปหลัง login สำเร็จ: หน้าที่จำไว้ใน ?redirect= ถ้าปลอดภัย ไม่งั้นหน้าแรก
export function postLoginPath(): string {
  const redirect = new URLSearchParams(window.location.search).get(REDIRECT_PARAM);
  return safeRedirectPath(redirect) ?? routes.home;
}
