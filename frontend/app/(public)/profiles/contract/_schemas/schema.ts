import { z } from "zod";
import { isValidPhone } from "@/lib/utils";

export const AddContactSchema = z.object({
  id: z.number().optional(),
  contactName: z.string().min(1, "กรุณากรอกชื่อผู้ติดต่อ"),
  contactPosition: z.string().optional(),
  contactPhone: z
    .string()
    .optional()
    .refine((v) => !v || isValidPhone(v), "เบอร์โทรไม่ถูกต้อง (ขึ้นต้นด้วย 0 และมี 9-10 หลัก)"),
  contactEmail: z.union([z.literal(""), z.email("อีเมลไม่ถูกต้อง")]).optional(),
  lineId: z.string().optional(),
  otherContact: z.string().optional(),
  isMainContact: z.boolean(),
});

export type AddContactValues = z.infer<typeof AddContactSchema>;
