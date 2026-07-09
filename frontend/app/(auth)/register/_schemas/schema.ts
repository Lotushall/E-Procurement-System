import { z } from "zod";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const formatWithGroups = (digits: string, groups: number[]) => {
    const parts: string[] = [];
    let index = 0;
    for (const size of groups) {
        if (index >= digits.length) break;
        parts.push(digits.slice(index, index + size));
        index += size;
    }
    return parts.join("-");
};

// เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน: X-XXXX-XXXXX-XX-X (13 หลัก)
export const formatCitizenId = (value: string) => formatWithGroups(digitsOnly(value).slice(0, 13), [1, 4, 5, 2, 1]);

// เบอร์ติดต่อ: 0X-XXX-XXXX (9 หลัก) หรือ 0XX-XXX-XXXX (10 หลัก)
export const formatPhone = (value: string) => {
    const digits = digitsOnly(value).slice(0, 10);
    return formatWithGroups(digits, digits.length > 9 ? [3, 3, 4] : [2, 3, 4]);
};

export const RegisterSchema = z
    .object({
        vendorType: z.enum(["company", "individual"]),
        companyName: z.string().optional(),
        taxId: z.string().optional(),
        fullName: z.string().optional(),
        idCard: z.string().optional(),
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
