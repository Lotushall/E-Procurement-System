import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserStatusBadge } from "@/components/user-status-badge";

describe("UserStatusBadge", () => {
  it.each([
    ["pending", "รอตรวจสอบ"],
    ["active", "ใช้งานอยู่"],
    ["suspended", "ระงับการใช้งาน"],
    ["inactive", "ปิดใช้งาน"],
  ])("renders %s as %s", (status, label) => {
    render(<UserStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders nothing for an unknown status", () => {
    const { container } = render(<UserStatusBadge status="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });
});
