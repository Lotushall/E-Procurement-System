import { z } from "zod";

// คืน error ของแต่ละ field เช่น { password: ["รหัสผ่านไม่ตรงกัน"] } — ผ่าน validation จะได้ {}
export function fieldErrorsOf(schema: z.ZodType, input: unknown): Record<string, string[] | undefined> {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}
