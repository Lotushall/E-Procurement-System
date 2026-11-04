import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TenderProjectSortSelect } from "@/app/dashboard/tender-projects/_components/filters/tender-project-sort-select";
import type { TenderProjectSortValue } from "@/app/dashboard/tender-projects/_hooks/use-tender-project-list-page";

const OPTIONS: [TenderProjectSortValue, string][] = [
  ["latest", "เพิ่มล่าสุด"],
  ["budget:desc", "งบประมาณ มาก → น้อย"],
  ["budget:asc", "งบประมาณ น้อย → มาก"],
  ["name:asc", "ชื่อโครงการ ก → ฮ"],
  ["name:desc", "ชื่อโครงการ ฮ → ก"],
  ["project_code:desc", "รหัสโครงการ ใหม่ → เก่า"],
  ["project_code:asc", "รหัสโครงการ เก่า → ใหม่"],
];

function setup(value: TenderProjectSortValue = "latest", className?: string) {
  const onValueChange = vi.fn();
  render(<TenderProjectSortSelect value={value} onValueChange={onValueChange} className={className} />);
  return { onValueChange, user: userEvent.setup(), trigger: screen.getByRole("combobox", { name: "เรียงตาม" }) };
}

describe("TenderProjectSortSelect", () => {
  it.each(OPTIONS)("shows %s as %s", (value, label) => {
    const { trigger } = setup(value);

    expect(trigger).toHaveTextContent(label);
  });

  it("offers every column and direction pair the table headers can set", async () => {
    const { user, trigger } = setup();

    await user.click(trigger);

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(OPTIONS.map(([, label]) => label));
  });

  it.each(OPTIONS)("reports %s when %s is chosen", async (value, label) => {
    // เริ่มจากค่าที่ต่างจากที่จะเลือก เพื่อให้ onValueChange ถูกเรียกจริง
    const { user, trigger, onValueChange } = setup(value === "latest" ? "name:asc" : "latest");

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: label }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(value);
  });

  it("applies the extra class name to the trigger", () => {
    const { trigger } = setup("latest", "xl:hidden");

    expect(trigger).toHaveClass("xl:hidden");
  });
});
