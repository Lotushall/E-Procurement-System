import { afterEach, beforeEach, vi } from "vitest";

// ล็อกเวลาปัจจุบันให้ test ที่คำนวณจาก new Date() — ปลอมเฉพาะ Date ไม่แตะ setTimeout ของ Testing Library
export function freezeTimeAt(iso: string) {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(iso));
  });

  afterEach(() => {
    vi.useRealTimers();
  });
}
