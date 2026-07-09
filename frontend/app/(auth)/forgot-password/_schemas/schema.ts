import { z } from "zod";

export const ForgotPasswordSchema = z.object({
    email: z.email("กรุณากรอกอีเมลให้ถูกต้อง"),
});

export type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;
