import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyContent from "@/components/legal/privacy-content";

describe("PrivacyContent", () => {
  it("renders all nine numbered sections in order", () => {
    render(<PrivacyContent />);

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "1. ขอบเขตของนโยบาย",
      "2. ข้อมูลส่วนบุคคลที่เก็บรวบรวม",
      "3. วัตถุประสงค์ในการเก็บรวบรวมและใช้ข้อมูล",
      "4. การเปิดเผยข้อมูลแก่บุคคลที่สาม",
      "5. ระยะเวลาการเก็บรักษาข้อมูล",
      "6. มาตรการรักษาความปลอดภัยของข้อมูล",
      "7. สิทธิของเจ้าของข้อมูลส่วนบุคคล",
      "8. ช่องทางติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล",
      "9. การปรับปรุงนโยบาย",
    ]);
  });

  it("lists the data subject rights", () => {
    render(<PrivacyContent />);

    expect(screen.getByText("สิทธิขอเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคลของตน")).toBeInTheDocument();
    expect(screen.getAllByRole("list")).toHaveLength(3);
  });
});
