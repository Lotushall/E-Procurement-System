import { isAxiosError } from "axios";
import type { FieldValues, Path, UseFormGetValues, UseFormSetError } from "react-hook-form";

export const FIELD_ERRORS_TOAST = "กรุณาตรวจสอบข้อมูลที่กรอก";

type ErrorBody = { message?: string; errors?: Record<string, string[]> };

/**
 * แปลง error จาก API เป็นข้อความสำหรับ toast — 422 ที่มี errors จะใส่ข้อความลงช่องที่ backend ระบุ
 * (เฉพาะช่องที่มีในฟอร์ม) แล้วบอกให้ตรวจสอบช่องที่กรอก; key ที่ไม่ตรงช่องไหน (เช่น token)
 * ใช้ข้อความนั้นเป็น toast แทน จะได้ไม่หายไป
 */
export function handleServerError<T extends FieldValues>(
  error: unknown,
  form: { setError: UseFormSetError<T>; getValues: UseFormGetValues<T> },
  fallback: string,
): string {
  if (!isAxiosError(error)) return fallback;

  const data = error.response?.data as ErrorBody | undefined;
  const fieldErrors = error.response?.status === 422 ? data?.errors : undefined;
  if (!fieldErrors) return data?.message ?? fallback;

  const fields = new Set(Object.keys(form.getValues()));
  let matched = false;
  let unmatched: string | undefined;

  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages[0];
    if (!message) continue;
    if (fields.has(field)) {
      form.setError(field as Path<T>, { type: "server", message }, { shouldFocus: !matched });
      matched = true;
    } else {
      unmatched ??= message;
    }
  }

  return unmatched ?? (matched ? FIELD_ERRORS_TOAST : (data?.message ?? fallback));
}
