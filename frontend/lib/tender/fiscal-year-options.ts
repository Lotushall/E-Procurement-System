const CURRENT_BUDDHIST_YEAR = new Date().getFullYear() + 543;

// ตัวกรองปีงบประมาณ (พ.ศ.): ปีหน้าย้อนลงไป 5 ปี — ใช้ร่วมกันในหน้าโครงการและหน้า TOR
export const FISCAL_YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "ทุกปีงบประมาณ" },
  ...Array.from({ length: 5 }, (_, i) => {
    const year = CURRENT_BUDDHIST_YEAR + 1 - i;
    return { value: String(year), label: `ปีงบประมาณ ${year}` };
  }),
];
