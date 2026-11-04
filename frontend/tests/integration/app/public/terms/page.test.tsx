import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage from "@/app/(public)/terms/page";

describe("TermsPage", () => {
  it("shows the terms heading and its first section", () => {
    render(<TermsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "ข้อกำหนดและเงื่อนไขการใช้งาน" })).toBeInTheDocument();
    expect(screen.getByText("1. บททั่วไป")).toBeInTheDocument();
  });
});
