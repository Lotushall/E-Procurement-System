import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SectionTitle from "@/app/(public)/profiles/_components/section-title";

describe("SectionTitle", () => {
  it("renders the title as a heading with its description", () => {
    render(<SectionTitle title="ข้อมูลบัญชี" desc="ชื่อผู้ใช้และอีเมล" />);

    expect(screen.getByRole("heading", { name: "ข้อมูลบัญชี" })).toBeInTheDocument();
    expect(screen.getByText("ชื่อผู้ใช้และอีเมล")).toBeInTheDocument();
  });

  it("renders children (action area) next to the title when given", () => {
    render(
      <SectionTitle title="ผู้ติดต่อ" desc="รายชื่อ">
        <button type="button">เพิ่มผู้ติดต่อ</button>
      </SectionTitle>,
    );

    expect(screen.getByRole("button", { name: "เพิ่มผู้ติดต่อ" })).toBeInTheDocument();
  });
});
