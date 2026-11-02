import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  TENDER_PROJECT_STATUSES,
  TENDER_PROJECT_STATUS_STYLE,
  TenderProjectStatusBadge,
} from "@/components/tender-project-status-badge";

describe("TenderProjectStatusBadge", () => {
  it.each(Object.entries(TENDER_PROJECT_STATUS_STYLE))("renders the label for %s", (status, style) => {
    render(<TenderProjectStatusBadge status={status} />);
    expect(screen.getByText(style.label)).toBeInTheDocument();
  });

  it("renders nothing for an unknown status", () => {
    const { container } = render(<TenderProjectStatusBadge status="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists every status in the filter order", () => {
    expect(TENDER_PROJECT_STATUSES).toEqual(Object.keys(TENDER_PROJECT_STATUS_STYLE));
  });
});
