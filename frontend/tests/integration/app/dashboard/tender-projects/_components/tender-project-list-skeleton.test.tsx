import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  TenderProjectListSkeleton,
  TenderProjectTableSkeleton,
} from "@/app/dashboard/tender-projects/_components/tender-project-list-skeleton";

describe("TenderProjectTableSkeleton", () => {
  it("renders four placeholder cards for the small-screen layout", () => {
    const { container } = render(<TenderProjectTableSkeleton />);

    const cards = container.querySelector(".xl\\:hidden")!;
    expect(cards.children).toHaveLength(4);
    for (const card of Array.from(cards.children)) {
      expect(card.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    }
  });

  it("renders a table placeholder with eight header cells and six rows", () => {
    render(<TenderProjectTableSkeleton />);

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(8);
    expect(within(table).getAllByRole("row")).toHaveLength(1 + 6);
  });

  it("shows no real text", () => {
    const { container } = render(<TenderProjectTableSkeleton />);

    expect(container).toHaveTextContent(/^$/);
  });
});

describe("TenderProjectListSkeleton", () => {
  it("shows the stat labels with skeleton values above the table placeholder", () => {
    render(<TenderProjectListSkeleton />);

    for (const label of ["โครงการทั้งหมด", "กำลังดำเนินการ", "เสร็จสิ้นแล้ว", "งบประมาณรวม"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
