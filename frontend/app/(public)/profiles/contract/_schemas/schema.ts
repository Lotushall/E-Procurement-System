import { z } from "zod";

export const AddContactSchema = z.object({
  contactName: z.string().min(1, "กรุณากรอกชื่อผู้ติดต่อ"),
  contactPosition: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.union([z.literal(""), z.email("อีเมลไม่ถูกต้อง")]).optional(),
  lineId: z.string().optional(),
  otherContact: z.string().optional(),
  isMainContact: z.boolean(),
});

export type AddContactValues = z.infer<typeof AddContactSchema>;
