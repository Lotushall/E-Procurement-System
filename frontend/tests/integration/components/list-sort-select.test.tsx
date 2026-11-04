import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ListSortSelect, type ListSortOption } from "@/components/list-sort-select";

const OPTIONS: ListSortOption[] = [
  { label: "ค่าเริ่มต้น" },
  { label: "ชื่อ ก-ฮ", id: "name", desc: false },
  { label: "งบประมาณ มาก-น้อย", id: "budget", desc: true },
];

describe("ListSortSelect", () => {
  it("shows the default option label when nothing is sorted", () => {
    render(<ListSortSelect options={OPTIONS} sorting={[]} onSortingChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("ค่าเริ่มต้น");
  });

  it("shows the label of the current sort", () => {
    render(<ListSortSelect options={OPTIONS} sorting={[{ id: "budget", desc: true }]} onSortingChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("งบประมาณ มาก-น้อย");
  });

  it("calls onSortingChange with the chosen column and direction", async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    render(<ListSortSelect options={OPTIONS} sorting={[]} onSortingChange={onSortingChange} />);

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "ชื่อ ก-ฮ" }));

    expect(onSortingChange).toHaveBeenCalledWith([{ id: "name", desc: false }]);
  });

  it("calls onSortingChange with a descending sort", async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    render(<ListSortSelect options={OPTIONS} sorting={[]} onSortingChange={onSortingChange} />);

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "งบประมาณ มาก-น้อย" }));

    expect(onSortingChange).toHaveBeenCalledWith([{ id: "budget", desc: true }]);
  });

  it("calls onSortingChange with [] when the default option is chosen", async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    render(<ListSortSelect options={OPTIONS} sorting={[{ id: "name", desc: false }]} onSortingChange={onSortingChange} />);

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "ค่าเริ่มต้น" }));

    expect(onSortingChange).toHaveBeenCalledWith([]);
  });

  it("applies a custom className to the trigger", () => {
    render(<ListSortSelect options={OPTIONS} sorting={[]} onSortingChange={vi.fn()} className="max-w-xs" />);

    expect(screen.getByRole("combobox", { name: "เรียงตาม" })).toHaveClass("max-w-xs");
  });
});
