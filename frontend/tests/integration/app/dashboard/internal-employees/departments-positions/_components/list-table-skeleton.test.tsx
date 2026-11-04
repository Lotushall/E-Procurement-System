import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListTableSkeleton } from "@/app/dashboard/internal-employees/departments-positions/_components/list-table-skeleton";

describe("ListTableSkeleton", () => {
  it("renders a table with a header row and six body rows of three cells", () => {
    render(<ListTableSkeleton />);

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(7);
    expect(within(screen.getAllByRole("rowgroup")[0]).getAllByRole("columnheader")).toHaveLength(3);
    for (const row of rows.slice(1)) {
      expect(within(row).getAllByRole("cell")).toHaveLength(3);
    }
  });

  it("is placeholders only: no text, and two action placeholders per body row", () => {
    const { container } = render(<ListTableSkeleton />);

    expect(screen.getByRole("table").textContent).toBe("");
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3 + 6 * 4);
  });
});
