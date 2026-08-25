import { z } from "zod";

export const InternalProfileFormSchema = z.object({
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  employeeNo: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  phone: z.string().optional(),
});

export type InternalProfileFormValues = z.infer<typeof InternalProfileFormSchema>;
