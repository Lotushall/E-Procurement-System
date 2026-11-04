import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SettingsPage from "@/app/dashboard/settings/page";

describe("SettingsPage", () => {
  // หน้านี้ยังเป็น placeholder (มีแค่ข้อความ "SettingsPage") ไม่มีฟอร์มหรือ API
  it("renders the placeholder text with no controls yet", () => {
    const { container } = render(<SettingsPage />);

    expect(screen.getByText("SettingsPage")).toBeInTheDocument();
    expect(container.querySelector("button, input, a")).toBeNull();
  });
});
