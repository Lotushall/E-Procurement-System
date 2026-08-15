import { z } from "zod";

export const PermissionFormSchema = z.object({
  name: z
    .string()
    .min(1, "กรุณากรอกชื่อ permission")
    .regex(
      /^[a-z][a-z0-9_]*\.[a-z][a-zA-Z0-9_]*$/,
      "รูปแบบต้องเป็น prefix.action เช่น reports.export (prefix ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น ส่วน action อนุญาตตัวพิมพ์ใหญ่ได้ เช่น updateStatus)",
    ),
  label: z.string().min(1, "กรุณากรอก label"),
});

export type PermissionFormValues = z.infer<typeof PermissionFormSchema>;
