import { isAxiosError } from "axios";

// id ของหน้า detail มาจาก ?id= — รับเฉพาะจำนวนเต็มบวก (1.5, -1, "abc" ถือว่าไม่พบ ไม่ยิง API)
export function isPositiveId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

// 404 = ไม่มีข้อมูลนี้ (หรืออยู่นอกขอบเขตที่ผู้ใช้ดูได้) — error อื่น (500, network) คือโหลดไม่สำเร็จ ให้ผู้ใช้ลองใหม่
export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

export const LOAD_ERROR_MESSAGE = "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง";
