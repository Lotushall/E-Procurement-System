import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VendorStatusBadge } from "@/components/vendor-status-badge";

describe("VendorStatusBadge", () => {
  it.each([
    ["pending", "รอตรวจสอบ"],
    ["approved", "อนุมัติแล้ว"],
    ["rejected", "ถูกปฏิเสธ"],
  ])("renders %s as %s", (status, label) => {
    render(<VendorStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders nothing for an unknown status", () => {
    const { container } = render(<VendorStatusBadge status="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });
});
