import { z } from "zod";

export const CreateUserSchema = z.object({
  username: z.string().min(1, "กรุณากรอก username"),
  email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  internalProfileId: z.string().min(1, "กรุณาเลือกพนักงาน"),
  role: z.string().min(1, "กรุณาเลือก role"),
  permissions: z.array(z.string()),
});

export type CreateUserValues = z.infer<typeof CreateUserSchema>;
