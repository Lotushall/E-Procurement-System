import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CARD_GRID_CLASS,
  UserListSkeleton,
  UserTableSkeleton,
} from "@/app/dashboard/users/_components/user-list-skeleton";

const skeletons = (container: HTMLElement) => container.querySelectorAll('[data-slot="skeleton"]');

describe("user-list-skeleton", () => {
  it("exports the card grid class shared with the data table", () => {
    expect(CARD_GRID_CLASS).toBe("sm:grid-cols-1 lg:grid-cols-2");
  });

  it("UserTableSkeleton renders a desktop table skeleton with six columns and six rows", () => {
    const { container } = render(<UserTableSkeleton />);

    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    expect(table!.querySelectorAll("thead th")).toHaveLength(6);
    expect(table!.querySelectorAll("tbody tr")).toHaveLength(6);
    expect(table!.querySelectorAll("tbody tr:first-child td")).toHaveLength(6);
    expect(skeletons(container).length).toBeGreaterThan(table!.querySelectorAll("td").length);
  });

  it("UserTableSkeleton shows the table only from xl and four cards (using the shared grid class) below it", () => {
    const { container } = render(<UserTableSkeleton />);

    const tableWrapper = container.querySelector("table")!.closest("div.hidden");
    expect(tableWrapper).toHaveClass("xl:block");
    const cards = container.querySelector("div.xl\\:hidden");
    expect(cards).toHaveClass("sm:grid-cols-1", "lg:grid-cols-2");
    expect(cards!.children).toHaveLength(4);
  });

  it("UserListSkeleton wraps the table skeleton", () => {
    const { container } = render(<UserListSkeleton />);

    expect(container.querySelector("table")).not.toBeNull();
    expect(container.firstElementChild).toHaveClass("flex", "flex-col");
  });
});
