import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsContent from "@/components/legal/terms-content";

describe("TermsContent", () => {
  it("renders all ten numbered sections in order", () => {
    render(<TermsContent />);

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "1. บททั่วไป",
      "2. การสมัครสมาชิกและบัญชีผู้ใช้",
      "3. การเสนอราคาและกระบวนการจัดซื้อจัดจ้าง",
      "4. หน้าที่และจรรยาบรรณของผู้ค้า",
      "5. ทรัพย์สินทางปัญญาและการรักษาความลับ",
      "6. การระงับและยกเลิกบัญชี",
      "7. ข้อจำกัดความรับผิด",
      "8. การแก้ไขเปลี่ยนแปลงข้อกำหนด",
      "9. กฎหมายที่ใช้บังคับ",
      "10. ช่องทางติดต่อ",
    ]);
  });

  it("renders the bullet lists of sections 2 to 4", () => {
    render(<TermsContent />);

    expect(screen.getAllByRole("list")).toHaveLength(3);
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
  });
});
