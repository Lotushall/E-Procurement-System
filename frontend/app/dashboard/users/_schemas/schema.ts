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

const OptionalPasswordSchema = z
  .union([z.literal(""), z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")])
  .optional();

export const UpdateAccountSchema = z.object({
  username: z.string().min(1, "กรุณากรอก username"),
  email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
  password: OptionalPasswordSchema,
});

export type UpdateAccountValues = z.infer<typeof UpdateAccountSchema>;

export const UpdateInternalUserSchema = z.object({
  username: z.string().min(1, "กรุณากรอก username"),
  email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
  password: OptionalPasswordSchema,
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  employeeNo: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "กรุณาเลือก role"),
});

export type UpdateInternalUserValues = z.infer<typeof UpdateInternalUserSchema>;
