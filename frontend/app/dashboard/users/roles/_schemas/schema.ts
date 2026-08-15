import { z } from "zod";

export const RoleFormSchema = z.object({
  name: z
    .string()
    .min(1, "กรุณากรอกชื่อ role")
    .regex(/^[a-z][a-z0-9_]*$/, "ใช้ได้แค่ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)"),
  permissions: z.array(z.string()).min(1, "กรุณาเลือกอย่างน้อย 1 permission"),
});

export type RoleFormValues = z.infer<typeof RoleFormSchema>;
