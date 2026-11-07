import z from "zod";

export const CreateTorSchema = z
  .object({
    title: z
      .string()
      .min(1, "กรุณากรอกชื่อ TOR")
      .max(255, "ชื่อ TOR ต้องไม่เกิน 255 ตัวอักษร"),
    scopeOfWork: z.string().min(1, "กรุณากรอกขอบเขตงาน"),
    departmentId: z.string().min(1, "กรุณาเลือกหน่วยงาน"),
    tenderProjectId: z.string().optional(),
    budgetEstimate: z
      .string()
      .min(1, "กรุณากรอกงบประมาณ")
      .refine(
        (v) => !Number.isNaN(Number(v)) && Number(v) <= 999999999999.99,
        "งบประมาณไม่ถูกต้อง",
      ),
    procurementMethod: z.string().min(1, "กรุณาเลือกวิธีจัดซื้อ").max(255),
    fiscalYear: z.string().min(1, "กรุณาเลือกปีงบประมาณ"),
    biddingStartAt: z.string().optional(),
    biddingEndAt: z.string().optional(),
  })
  .refine(
    (v) =>
      !v.biddingStartAt || !v.biddingEndAt || v.biddingEndAt > v.biddingStartAt, // > ไม่ใช่ >= ตาม rule after:
    { message: "วันปิดรับข้อเสนอต้องหลังวันเปิดรับ", path: ["biddingEndAt"] },
  );
