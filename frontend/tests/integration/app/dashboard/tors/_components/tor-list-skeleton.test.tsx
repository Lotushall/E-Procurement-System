import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TorListSkeleton, TorTableSkeleton } from "@/app/dashboard/tors/_components/tor-list-skeleton";

describe("TorTableSkeleton", () => {
  it("renders four placeholder cards for the small-screen layout", () => {
    const { container } = render(<TorTableSkeleton />);

    const cards = container.querySelector(".xl\\:hidden")!;
    expect(cards.children).toHaveLength(4);
    for (const card of Array.from(cards.children)) {
      expect(card.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    }
  });

  it("renders a table placeholder with seven header cells and six rows", () => {
    render(<TorTableSkeleton />);

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(7);
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 6);
  });

  it("shows no real text, links or cards", () => {
    const { container } = render(<TorTableSkeleton />);

    expect(container).toHaveTextContent(/^$/);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});

describe("TorListSkeleton", () => {
  it("renders the table placeholder", () => {
    render(<TorListSkeleton />);

    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
