import { z } from "zod";

export const AddContactSchema = z.object({
  contactName: z.string().min(1, "กรุณากรอกชื่อผู้ติดต่อ"),
  contactPosition: z.string().optional(),
  contactPhone: z.string().min(1, "กรุณากรอกเบอร์โทร"),
  contactEmail: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
  lineId: z.string().optional(),
  otherContact: z.string().optional(),
});

export type AddContactValues = z.infer<typeof AddContactSchema>;
