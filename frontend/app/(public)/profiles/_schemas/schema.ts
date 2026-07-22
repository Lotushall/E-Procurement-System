import { z } from "zod";

export const AccountInfoSchema = z.object({
  username: z.string().min(1, "กรุณากรอกชื่อผู้ใช้"),
  email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
});

export type AccountInfoValues = z.infer<typeof AccountInfoSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านปัจจุบัน"),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่านใหม่"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export type ChangePasswordValues = z.infer<typeof ChangePasswordSchema>;
