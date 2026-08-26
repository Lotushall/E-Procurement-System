import { z } from "zod";

export const DepartmentFormSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อแผนก"),
});

export type DepartmentFormValues = z.infer<typeof DepartmentFormSchema>;

export const PositionFormSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อตำแหน่ง"),
});

export type PositionFormValues = z.infer<typeof PositionFormSchema>;
