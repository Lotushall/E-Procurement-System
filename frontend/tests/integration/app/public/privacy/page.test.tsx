import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "@/app/(public)/privacy/page";

describe("PrivacyPage", () => {
  it("shows the privacy policy heading and its first section", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { level: 1, name: "นโยบายความเป็นส่วนตัว" })).toBeInTheDocument();
    expect(screen.getByText("1. ขอบเขตของนโยบาย")).toBeInTheDocument();
  });
});
