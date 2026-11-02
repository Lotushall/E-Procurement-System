import { vi } from "vitest";

type Message<T> = string | ((value: T) => string);
type PromiseOptions<T> = { loading?: string; success?: Message<T>; error?: Message<unknown> };

const resolve = <T,>(message: Message<T> | undefined, value: T) =>
  typeof message === "function" ? message(value) : message;

// แทน sonner ทั้ง module (ผูกไว้ใน tests/setup.ts) — toast.promise รอ promise จริงแล้วเรียก callback success/error
// เหมือนของจริง (โค้ดหลายที่ปิด dialog หรือเรียก onSuccess ใน callback นั้น) แล้วส่งข้อความต่อให้ toast.success/toast.error
// test จึงเช็คได้ตรงๆ ว่า expect(toast.success).toHaveBeenCalledWith("ลบโครงการสำเร็จ")
export const toast = Object.assign(vi.fn(), {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  message: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
  promise: vi.fn(<T,>(promise: Promise<T> | (() => Promise<T>), options: PromiseOptions<T> = {}) => {
    const running = typeof promise === "function" ? promise() : promise;
    running.then(
      (value) => toast.success(resolve(options.success, value)),
      (error: unknown) => toast.error(resolve(options.error, error)),
    );
    return { unwrap: () => running };
  }),
});

export function resetToast() {
  toast.mockReset();
  Object.values(toast).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) fn.mockReset();
  });
}

export const Toaster = () => null;
