import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { resetNavigation } from "@/tests/mocks/next-navigation";
import { resetToast } from "@/tests/mocks/sonner";
import { server } from "@/tests/msw/server";

// ใช้ mock ทุกไฟล์ — import { router, setUrl } จาก "@/tests/mocks/next-navigation" และ { toast } จาก "sonner" ได้เลย
vi.mock("next/navigation", () => import("@/tests/mocks/next-navigation"));
vi.mock("sonner", () => import("@/tests/mocks/sonner"));

// jsdom ไม่มี API พวกนี้ แต่ component ของ base-ui / shadcn เรียกใช้
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};

// request ที่ไม่มี handler รองรับให้ test fail ทันที — กันไม่ให้หลุดไปยิง API จริง
beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetNavigation();
  resetToast();
});

afterAll(() => {
  server.close();
});
