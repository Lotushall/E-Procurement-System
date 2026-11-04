import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VendorStatsCards } from "@/app/dashboard/vendors/_components/vendor-stats-cards";

const COUNTS = { all: 10, pending: 4, approved: 5, rejected: 1 };

function card(label: string) {
  return screen.getByText(label).closest("[role=button]") as HTMLElement;
}

describe("VendorStatsCards", () => {
  it("shows the four cards in order with their counts", () => {
    render(<VendorStatsCards counts={COUNTS} active="all" onSelect={vi.fn()} />);

    const cards = screen.getAllByRole("button");
    expect(cards.map((c) => c.textContent)).toEqual([
      "ทั้งหมด10",
      "รอตรวจสอบ4",
      "อนุมัติแล้ว5",
      "ถูกปฏิเสธ1",
    ]);
  });

  it("highlights only the active card with its ring", () => {
    render(<VendorStatsCards counts={COUNTS} active="pending" onSelect={vi.fn()} />);

    expect(card("รอตรวจสอบ")).toHaveClass("ring-1", "ring-yellow-600/40");
    expect(card("ทั้งหมด")).not.toHaveClass("ring-1");
    expect(card("อนุมัติแล้ว")).not.toHaveClass("ring-1");
    expect(card("ถูกปฏิเสธ")).not.toHaveClass("ring-1");
  });

  it("selects a filter on click", async () => {
    const onSelect = vi.fn();
    render(<VendorStatsCards counts={COUNTS} active="all" onSelect={onSelect} />);

    await userEvent.click(card("ถูกปฏิเสธ"));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("rejected");
  });

  it("selects a filter with Enter and Space", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<VendorStatsCards counts={COUNTS} active="all" onSelect={onSelect} />);

    card("อนุมัติแล้ว").focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onSelect).toHaveBeenNthCalledWith(1, "approved");
    expect(onSelect).toHaveBeenNthCalledWith(2, "approved");
  });

  it("ignores other keys", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<VendorStatsCards counts={COUNTS} active="all" onSelect={onSelect} />);

    card("รอตรวจสอบ").focus();
    await user.keyboard("a");

    expect(onSelect).not.toHaveBeenCalled();
  });
});
