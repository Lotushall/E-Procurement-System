import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReportsPage from "@/app/dashboard/reports/page";

describe("ReportsPage", () => {
  // หน้านี้ยังเป็น placeholder ว่างเปล่า (ไม่มีเนื้อหา/ไม่มี API) — เช็คแค่ว่า render ได้โดยไม่ error และไม่มี UI ใด ๆ
  it("renders an empty placeholder with no content or controls yet", () => {
    const { container } = render(<ReportsPage />);

    expect(container.firstElementChild).toBeEmptyDOMElement();
    expect(container.children).toHaveLength(1);
  });
});
