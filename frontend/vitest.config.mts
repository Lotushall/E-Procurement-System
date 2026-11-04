import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// วันที่ใน test เขียนเป็นเวลาไทย ล็อก timezone ไว้ให้ผลเหมือนกันทุกเครื่องและบน CI
process.env.TZ = "Asia/Bangkok";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    // ให้หน้าเว็บกับ API อยู่ origin เดียวกัน — ถ้าต่าง origin jsdom จะบังคับ CORS แล้ว request โดนตีกลับเป็น Network Error
    environmentOptions: {
      jsdom: { url: "http://localhost:3000" },
    },
    setupFiles: ["./tests/setup.ts"],
    // test ฟอร์มยาวๆ (user-event พิมพ์ + เลือก combobox + ปฏิทิน) ใช้ ~0.8s ตอนรันเดี่ยว แต่เกิน 5s ตอนรันทั้งชุดบนเครื่องที่โหลดหนัก
    testTimeout: 15_000,
    include: ["tests/**/*.test.{ts,tsx}"],
    // ตรงกับ API_URL ใน tests/msw/server.ts — lib/api.ts อ่านค่านี้ตอนโหลด
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3000",
    },
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
      // components/ui มาจาก shadcn ไม่ได้เขียนเอง · types.ts มีแต่ type ไม่มีโค้ดให้รัน
      exclude: ["components/ui/**", "**/types.ts", "**/*.d.ts"],
      reporter: ["text-summary", "html"],
    },
  },
});
