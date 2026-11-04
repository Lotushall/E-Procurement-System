// ปีงบประมาณเก็บและแสดงเป็น ค.ศ. — ใช้ปีหน้าเป็นค่าเริ่มต้นเวลาสร้างโครงการ
export const NEXT_FISCAL_YEAR = new Date().getFullYear() + 1;

// ตัวเลือกปีงบประมาณในฟอร์มสร้าง/แก้ไขโครงการ: ปีหน้าย้อนลงไป 5 ปี
export const FISCAL_YEAR_CHOICES: { value: string; label: string }[] = Array.from({ length: 5 }, (_, i) => {
  const year = NEXT_FISCAL_YEAR - i;
  return { value: String(year), label: `ปีงบประมาณ ${year}` };
});

// ตัวกรองปีงบประมาณ — ใช้ร่วมกันในหน้าโครงการและหน้า TOR
export const FISCAL_YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "ทุกปีงบประมาณ" },
  ...FISCAL_YEAR_CHOICES,
];
