import { z } from "zod";

export const CreateUserSchema = z.object({
  username: z.string().min(1, "กรุณากรอก username"),
  email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  employeeNo: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "กรุณาเลือก role"),
});

export type CreateUserValues = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  employeeNo: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "กรุณาเลือก role"),
});

export type UpdateUserValues = z.infer<typeof UpdateUserSchema>;
