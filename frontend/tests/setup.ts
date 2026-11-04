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

// request ที่ไม่มี handler รองรับให้ test fail — "error" อย่างเดียวแค่ log + ทำให้ request error
// (React Query จับไว้เป็น isError ได้ test จึงยังผ่าน) เลยเก็บไว้แล้ว throw ใน afterEach
const unhandled: string[] = [];

beforeAll(() => {
  server.listen({
    async onUnhandledFrame({ frame, defaults }) {
      unhandled.push(await frame.getUnhandledMessage());
      defaults.error();
    },
  });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetNavigation();
  resetToast();
  if (unhandled.length > 0) {
    const messages = unhandled.splice(0);
    throw new Error(`Unhandled request(s) without an MSW handler:\n${messages.join("\n")}`);
  }
});

afterAll(() => {
  server.close();
});
