import { z } from "zod";

export const VendorCompanyInfoSchema = z.object({
  companyName: z.string().min(1, "กรุณากรอกชื่อบริษัท / นิติบุคคล"),
  businessType: z.string().min(1, "กรุณาเลือกประเภทธุรกิจ"),
  branchNo: z.string().optional(),
  businessRegistrationNo: z.string().min(1, "กรุณากรอกเลขทะเบียนนิติบุคคล"),
  taxId: z.string().min(1, "กรุณากรอกเลขผู้เสียภาษี"),
  address: z.string().min(1, "กรุณากรอกที่อยู่"),
  province: z.string().min(1, "กรุณากรอกจังหวัด"),
  postalCode: z.string().min(1, "กรุณากรอกรหัสไปรษณีย์"),
});

export type VendorCompanyInfoValues = z.infer<typeof VendorCompanyInfoSchema>;

export const VendorIndividualInfoSchema = z.object({
  storeName: z.string().min(1, "กรุณากรอกชื่อร้านค้า"),
  businessType: z.string().min(1, "กรุณาเลือกประเภทธุรกิจ"),
  prefix: z.string().optional(),
  firstname: z.string().min(1, "กรุณากรอกชื่อ"),
  lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
  citizenId: z.string().min(1, "กรุณากรอกเลขบัตรประชาชน"),
  taxId: z.string().optional(),
  address: z.string().min(1, "กรุณากรอกที่อยู่"),
  province: z.string().min(1, "กรุณากรอกจังหวัด"),
  postalCode: z.string().min(1, "กรุณากรอกรหัสไปรษณีย์"),
});

export type VendorIndividualInfoValues = z.infer<typeof VendorIndividualInfoSchema>;
