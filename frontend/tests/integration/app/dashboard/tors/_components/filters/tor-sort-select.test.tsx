import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TorSortSelect } from "@/app/dashboard/tors/_components/filters/tor-sort-select";
import type { TorSortValue } from "@/app/dashboard/tors/_hooks/use-tor-list-page";

const OPTIONS: [TorSortValue, string][] = [
  ["latest", "เพิ่มล่าสุด"],
  ["bidding_end_at:asc", "ปิดรับซอง ใกล้ → ไกล"],
  ["bidding_end_at:desc", "ปิดรับซอง ไกล → ใกล้"],
  ["budget_estimate:desc", "ราคากลาง มาก → น้อย"],
  ["budget_estimate:asc", "ราคากลาง น้อย → มาก"],
  ["title:asc", "ชื่อ TOR ก → ฮ"],
  ["title:desc", "ชื่อ TOR ฮ → ก"],
  ["tor_code:desc", "รหัส TOR ใหม่ → เก่า"],
  ["tor_code:asc", "รหัส TOR เก่า → ใหม่"],
  ["fiscal_year:desc", "ปีงบประมาณ ใหม่ → เก่า"],
  ["fiscal_year:asc", "ปีงบประมาณ เก่า → ใหม่"],
];

function setup(value: TorSortValue = "latest", className?: string) {
  const onValueChange = vi.fn();
  render(<TorSortSelect value={value} onValueChange={onValueChange} className={className} />);
  return { onValueChange, user: userEvent.setup(), trigger: screen.getByRole("combobox", { name: "เรียงตาม" }) };
}

describe("TorSortSelect", () => {
  it.each(OPTIONS)("shows %s as %s", (value, label) => {
    const { trigger } = setup(value);

    expect(trigger).toHaveTextContent(label);
  });

  it("offers every column and direction pair the table headers can set, plus fiscal year", async () => {
    const { user, trigger } = setup();

    await user.click(trigger);

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(OPTIONS.map(([, label]) => label));
  });

  it.each(OPTIONS)("reports %s when %s is chosen", async (value, label) => {
    // เริ่มจากค่าที่ต่างจากที่จะเลือก เพื่อให้ onValueChange ถูกเรียกจริง
    const { user, trigger, onValueChange } = setup(value === "latest" ? "title:asc" : "latest");

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: label }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(value);
  });

  it("applies the extra class name to the trigger", () => {
    const { trigger } = setup("latest", "lg:w-60");

    expect(trigger).toHaveClass("lg:w-60");
  });
});
