import { z } from "zod";

// เลข 13 หลักเหมือนตอนสมัคร — ค่าที่ยังเป็น mask จาก backend (เช่น xxxxxxxxx1234) แปลว่าไม่ได้แก้ ให้ผ่านได้ backend จะคงค่าเดิมไว้
const isThirteenDigitId = (value: string) => value.replace(/[^0-9x]/gi, "").length === 13;

const postalCode = z
  .string()
  .trim()
  .min(1, "กรุณากรอกรหัสไปรษณีย์")
  .regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องมี 5 หลัก");

export const VendorCompanyInfoSchema = z.object({
  companyName: z.string().min(1, "กรุณากรอกชื่อบริษัท / นิติบุคคล"),
  businessType: z.string().min(1, "กรุณาเลือกประเภทธุรกิจ"),
  branchNo: z.string().optional(),
  businessRegistrationNo: z
    .string()
    .min(1, "กรุณากรอกเลขทะเบียนนิติบุคคล")
    .refine(isThirteenDigitId, "เลขทะเบียนนิติบุคคลต้องมี 13 หลัก"),
  taxId: z
    .string()
    .min(1, "กรุณากรอกเลขผู้เสียภาษี")
    .refine(isThirteenDigitId, "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"),
  address: z.string().min(1, "กรุณากรอกที่อยู่"),
  province: z.string().min(1, "กรุณากรอกจังหวัด"),
  postalCode,
});

export type VendorCompanyInfoValues = z.infer<typeof VendorCompanyInfoSchema>;

export const VendorIndividualInfoSchema = z.object({
  storeName: z.string().min(1, "กรุณากรอกชื่อร้านค้า"),
  businessType: z.string().min(1, "กรุณาเลือกประเภทธุรกิจ"),
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  citizenId: z
    .string()
    .min(1, "กรุณากรอกเลขบัตรประชาชน")
    .refine(isThirteenDigitId, "เลขบัตรประชาชนต้องมี 13 หลัก"),
  taxId: z
    .string()
    .optional()
    .refine((v) => !v || isThirteenDigitId(v), "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"),
  address: z.string().min(1, "กรุณากรอกที่อยู่"),
  province: z.string().min(1, "กรุณากรอกจังหวัด"),
  postalCode,
});

export type VendorIndividualInfoValues = z.infer<typeof VendorIndividualInfoSchema>;
