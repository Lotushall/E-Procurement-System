import { z } from "zod";

export const CreateTenderProjectSchema = z
  .object({
    name: z.string().min(1, "กรุณากรอกชื่อโครงการ").max(255, "ชื่อโครงการต้องไม่เกิน 255 ตัวอักษร"),
    description: z.string().optional(),
    budget: z
      .string()
      .min(1, "กรุณากรอกงบประมาณ")
      .refine(
        (v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 999999999999.99,
        "งบประมาณไม่ถูกต้อง",
      ),
    departmentId: z.string().min(1, "กรุณาเลือกแผนก"),
    personInChargeId: z.string().optional(),
    procurementMethod: z.string().min(1, "กรุณาเลือกวิธีจัดซื้อ").max(255, "วิธีจัดซื้อต้องไม่เกิน 255 ตัวอักษร"),
    fiscalYear: z.string().min(1, "กรุณาเลือกปีงบประมาณ"),
    projectStartAt: z.string().optional(),
    projectEndAt: z.string().optional(),
  })
  .refine(
    (values) =>
      !values.projectStartAt || !values.projectEndAt || values.projectEndAt >= values.projectStartAt,
    { message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น", path: ["projectEndAt"] },
  );

export type CreateTenderProjectFormValues = z.infer<typeof CreateTenderProjectSchema>;

export const UpdateTenderProjectSchema = z
  .object({
    name: z.string().min(1, "กรุณากรอกชื่อโครงการ").max(255, "ชื่อโครงการต้องไม่เกิน 255 ตัวอักษร"),
    description: z.string().optional(),
    budget: z
      .string()
      .min(1, "กรุณากรอกงบประมาณ")
      .refine(
        (v) => !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 999999999999.99,
        "งบประมาณไม่ถูกต้อง",
      ),
    departmentId: z.string().min(1, "กรุณาเลือกแผนก"),
    personInChargeId: z.string().optional(),
    procurementMethod: z.string().min(1, "กรุณาเลือกวิธีจัดซื้อ").max(255, "วิธีจัดซื้อต้องไม่เกิน 255 ตัวอักษร"),
    fiscalYear: z.string().min(1, "กรุณาเลือกปีงบประมาณ"),
    projectStartAt: z.string().optional(),
    projectEndAt: z.string().optional(),
  })
  .refine(
    (values) =>
      !values.projectStartAt || !values.projectEndAt || values.projectEndAt >= values.projectStartAt,
    { message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น", path: ["projectEndAt"] },
  );

export type UpdateTenderProjectFormValues = z.infer<typeof UpdateTenderProjectSchema>;
