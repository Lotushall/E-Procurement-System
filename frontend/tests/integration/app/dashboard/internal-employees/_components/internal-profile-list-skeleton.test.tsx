import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CARD_GRID_CLASS,
  InternalProfileListSkeleton,
  InternalProfileTableSkeleton,
} from "@/app/dashboard/internal-employees/_components/internal-profile-list-skeleton";

describe("InternalProfileTableSkeleton", () => {
  it("renders the desktop table skeleton with a header row and 6 body rows of 6 cells", () => {
    const { container } = render(<InternalProfileTableSkeleton />);

    const table = container.querySelector("table")!;
    expect(table.querySelectorAll("tbody tr")).toHaveLength(6);
    table.querySelectorAll("tbody tr").forEach((row) => expect(row.querySelectorAll("td")).toHaveLength(6));
    expect(table.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("has one header cell per body cell (including the actions column), so the columns line up", () => {
    const { container } = render(<InternalProfileTableSkeleton />);

    const table = container.querySelector("table")!;
    const bodyCells = table.querySelector("tbody tr")!.querySelectorAll("td").length;
    expect(table.querySelectorAll("thead th")).toHaveLength(bodyCells);
  });

  it("renders the card skeleton with the shared grid class", () => {
    const { container } = render(<InternalProfileTableSkeleton />);

    expect(CARD_GRID_CLASS).toBe("sm:grid-cols-1 lg:grid-cols-2");
    expect(container.querySelector(".lg\\:grid-cols-2")).toBeInTheDocument();
  });
});

describe("InternalProfileListSkeleton", () => {
  it("wraps the table skeleton and nothing else", () => {
    const { container } = render(<InternalProfileListSkeleton />);

    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(6);
    expect(container.querySelector("input")).not.toBeInTheDocument();
  });
});
