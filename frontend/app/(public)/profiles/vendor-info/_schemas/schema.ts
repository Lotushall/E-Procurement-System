import { z } from "zod";
import { thaiIdError } from "@/lib/utils";

// ค่าที่ยังเป็น mask จาก backend (xxxxxxxxx1234) แปลว่าไม่ได้แก้ ให้ผ่านได้ backend จะคงค่าเดิมไว้
const stripIdFormatting = (value: string) => value.replace(/[^0-9x]/gi, "");
const isMaskedThaiId = (value: string) => /^x{9}\d{4}$/i.test(stripIdFormatting(value));

// ช่องจัดรูปแบบ mask ใหม่เป็น X-XXXX-XXXX1-23-4 แต่ ThaiIdNumberRule allowsMasked รับแค่ /^[xX]{9}\d{4}$/ — ส่งแบบไม่มีขีด
const compactMaskedThaiId = <T extends string | undefined>(value: T): T =>
  (value && isMaskedThaiId(value) ? stripIdFormatting(value) : value) as T;

// เลข 13 หลักต้องครบและ check digit ถูกต้องเหมือนตอนสมัคร — ค่าว่างปล่อยให้ min(1) หรือ optional ตัดสิน
const thaiId = (label: string) => (value: string | undefined, ctx: z.RefinementCtx) => {
  if (!value || isMaskedThaiId(value)) return;
  const message = thaiIdError(value, label);
  if (message) ctx.addIssue({ code: "custom", message });
};

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
    .superRefine(thaiId("เลขทะเบียนนิติบุคคล"))
    .transform(compactMaskedThaiId),
  taxId: z
    .string()
    .min(1, "กรุณากรอกเลขผู้เสียภาษี")
    .superRefine(thaiId("เลขประจำตัวผู้เสียภาษี"))
    .transform(compactMaskedThaiId),
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
    .superRefine(thaiId("เลขบัตรประชาชน"))
    .transform(compactMaskedThaiId),
  taxId: z.string().superRefine(thaiId("เลขประจำตัวผู้เสียภาษี")).transform(compactMaskedThaiId).optional(),
  address: z.string().min(1, "กรุณากรอกที่อยู่"),
  province: z.string().min(1, "กรุณากรอกจังหวัด"),
  postalCode,
});

export type VendorIndividualInfoValues = z.infer<typeof VendorIndividualInfoSchema>;
