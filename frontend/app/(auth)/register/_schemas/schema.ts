import { z } from "zod";
import { digitsOnly } from "@/lib/utils";

export const RegisterSchema = z
    .object({
        vendorType: z.enum(["company", "individual"]),
        companyName: z.string().optional(),
        taxId: z.string().optional(),
        fullName: z.string().optional(),
        idCard: z.string().optional(),
        storeName: z.string().optional(),
        phone: z.string().min(1, "กรุณากรอกเบอร์ติดต่อ"),
        username: z.string().min(3, "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"),
        email: z.email("อีเมลไม่ถูกต้อง").min(1, "กรุณากรอกอีเมล"),
        password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
        confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
        terms: z.boolean(),
    })
    .superRefine((data, ctx) => {
        if (data.vendorType === "company") {
            if (!data.companyName?.trim()) {
                ctx.addIssue({ code: "custom", message: "กรุณากรอกชื่อบริษัท / นิติบุคคล", path: ["companyName"] });
            }
            if (digitsOnly(data.taxId ?? "").length !== 13) {
                ctx.addIssue({ code: "custom", message: "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก", path: ["taxId"] });
            }
        } else {
            if (!data.fullName?.trim()) {
                ctx.addIssue({ code: "custom", message: "กรุณากรอกชื่อ – นามสกุล", path: ["fullName"] });
            }
            if (!data.storeName?.trim()) {
                ctx.addIssue({ code: "custom", message: "กรุณากรอกชื่อร้านค้า", path: ["storeName"] });
            }
            if (digitsOnly(data.idCard ?? "").length !== 13) {
                ctx.addIssue({ code: "custom", message: "เลขบัตรประชาชนต้องมี 13 หลัก", path: ["idCard"] });
            }
        }

        const phoneLength = digitsOnly(data.phone).length;
        if (phoneLength < 9 || phoneLength > 10) {
            ctx.addIssue({ code: "custom", message: "เบอร์ติดต่อไม่ถูกต้อง (9-10 หลัก)", path: ["phone"] });
        }

        if (data.password !== data.confirmPassword) {
            ctx.addIssue({ code: "custom", message: "รหัสผ่านไม่ตรงกัน", path: ["confirmPassword"] });
        }

        if (!data.terms) {
            ctx.addIssue({ code: "custom", message: "กรุณายอมรับข้อกำหนดและเงื่อนไข", path: ["terms"] });
        }
    });

export type RegisterValues = z.infer<typeof RegisterSchema>;
