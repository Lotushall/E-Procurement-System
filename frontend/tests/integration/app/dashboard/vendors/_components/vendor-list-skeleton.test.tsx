import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CARD_GRID_CLASS,
  VendorListSkeleton,
  VendorTableSkeleton,
} from "@/app/dashboard/vendors/_components/vendor-list-skeleton";

describe("VendorTableSkeleton", () => {
  it("renders the desktop table skeleton with a header row and 6 body rows of 8 cells", () => {
    const { container } = render(<VendorTableSkeleton />);

    const table = container.querySelector("table")!;
    expect(table.querySelectorAll("thead th")).toHaveLength(8);
    const rows = table.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(6);
    rows.forEach((row) => expect(row.querySelectorAll("td")).toHaveLength(8));
  });

  it("renders the card skeleton with the shared grid class", () => {
    const { container } = render(<VendorTableSkeleton />);

    expect(CARD_GRID_CLASS).toBe("sm:grid-cols-1 lg:grid-cols-2");
    expect(container.querySelector(".lg\\:grid-cols-2")).toBeInTheDocument();
  });
});

describe("VendorListSkeleton", () => {
  it("renders four stat card placeholders above the table skeleton", () => {
    const { container } = render(<VendorListSkeleton />);

    const statGrid = container.querySelector(".md\\:grid-cols-4")!;
    expect(statGrid.querySelectorAll('[data-slot="card"]')).toHaveLength(4);
    expect(statGrid.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(8);
    expect(container.querySelector("table")).toBeInTheDocument();
  });
});
