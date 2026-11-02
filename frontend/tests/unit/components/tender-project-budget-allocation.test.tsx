import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  TenderProjectBudgetAllocation,
  isAllocationOverBudget,
} from "@/components/tender-project-budget-allocation";

describe("isAllocationOverBudget", () => {
  it.each([
    ["1000000", "0", false],
    ["1000000", "1000000", false],
    ["1000000", "1000000.01", true],
  ])("budget %s with %s allocated → %s", (budget, allocated, expected) => {
    expect(isAllocationOverBudget(budget, allocated)).toBe(expected);
  });
});

describe("TenderProjectBudgetAllocation — compact", () => {
  it("shows the allocated percent and remaining budget", () => {
    render(<TenderProjectBudgetAllocation budget="1000000" allocatedBudget="250000" />);

    expect(screen.getByRole("img", { name: "จัดสรร 25% ของงบประมาณ" })).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("เหลือ ฿750,000")).toBeInTheDocument();
  });

  it("says nothing is allocated yet", () => {
    render(<TenderProjectBudgetAllocation budget="1000000" allocatedBudget="0" />);

    expect(screen.getByText("ยังไม่ได้จัดสรร")).toBeInTheDocument();
    expect(screen.getByText("เหลือ ฿1,000,000")).toBeInTheDocument();
  });

  it("warns when the allocation exceeds the budget", () => {
    render(<TenderProjectBudgetAllocation budget="1000000" allocatedBudget="1200000" />);

    expect(screen.getByText("จัดสรรเกินงบ 120%")).toBeInTheDocument();
    expect(screen.getByText("เกิน ฿200,000")).toBeInTheDocument();
  });

  it("labels the bar as unallocated when the budget is zero", () => {
    render(<TenderProjectBudgetAllocation budget="0" allocatedBudget="0" />);
    expect(screen.getByRole("img", { name: "ยังไม่ได้จัดสรร" })).toBeInTheDocument();
  });
});

describe("TenderProjectBudgetAllocation — full", () => {
  it("shows how much is left for new TORs", () => {
    render(<TenderProjectBudgetAllocation budget="1000000" allocatedBudget="250000" variant="full" />);

    expect(screen.getByText("ยอดจัดสรร")).toBeInTheDocument();
    expect(screen.getByText("คงเหลือให้ตั้ง TOR ได้อีก ฿750,000")).toBeInTheDocument();
  });

  it("shows the overrun when over budget", () => {
    render(<TenderProjectBudgetAllocation budget="1000000" allocatedBudget="1200000" variant="full" />);
    expect(screen.getByText("เกินงบประมาณ ฿200,000")).toBeInTheDocument();
  });
});
