import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOR_STATUSES, TOR_STATUS_STYLE, TorStatusBadge } from "@/components/tor-status-badge";

describe("TorStatusBadge", () => {
  it.each(Object.entries(TOR_STATUS_STYLE))("renders the label for %s", (status, style) => {
    render(<TorStatusBadge status={status} />);
    expect(screen.getByText(style.label)).toBeInTheDocument();
  });

  it("renders nothing for an unknown status", () => {
    const { container } = render(<TorStatusBadge status="unknown" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists every status in the filter order", () => {
    expect(TOR_STATUSES).toEqual(Object.keys(TOR_STATUS_STYLE));
  });
});
