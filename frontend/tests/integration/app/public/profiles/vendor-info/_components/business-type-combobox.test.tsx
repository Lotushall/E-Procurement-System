import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { BusinessTypeCombobox } from "@/app/(public)/profiles/vendor-info/_components/business-type-combobox";
import { BUSINESS_TYPES } from "@/app/(public)/profiles/data/business-types";

function Harness({ initial = "", onChange }: { initial?: string; onChange?: (next: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <BusinessTypeCombobox
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

async function openAndSearch(text?: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox"));
  const search = await screen.findByPlaceholderText("ค้นหาประเภทธุรกิจ");
  if (text) await user.type(search, text);
  return user;
}

describe("BusinessTypeCombobox", () => {
  // base-ui ถือว่า "" คือมีค่าที่เลือกแล้ว (เฉพาะ null เท่านั้นที่แสดง placeholder) แต่ฟอร์มส่ง "" เมื่อยังไม่เลือก
  it("shows the placeholder when the value is empty (\"\")", () => {
    render(<Harness />);

    expect(screen.getByRole("combobox")).toHaveTextContent("เลือกประเภทธุรกิจ");
  });

  it("shows the current value on the trigger", () => {
    render(<Harness initial="การผลิต" />);

    expect(screen.getByRole("combobox")).toHaveTextContent("การผลิต");
  });

  it("lists every predefined business type once opened", async () => {
    render(<Harness />);

    await openAndSearch();

    expect(await screen.findAllByRole("option")).toHaveLength(BUSINESS_TYPES.length);
    expect(screen.getByRole("option", { name: "การผลิต" })).toBeInTheDocument();
    expect(screen.queryByText(/^\+ เพิ่ม/)).not.toBeInTheDocument();
  });

  it("selects a type and reports it", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const user = await openAndSearch();

    await user.click(await screen.findByRole("option", { name: "ค้าส่ง" }));

    expect(onChange).toHaveBeenCalledWith("ค้าส่ง");
    expect(screen.getByRole("combobox")).toHaveTextContent("ค้าส่ง");
  });

  it("filters the list by the search text", async () => {
    render(<Harness />);

    await openAndSearch("ค้าปลีก");

    expect(await screen.findAllByRole("option", { name: /ค้าปลีก/ })).not.toHaveLength(0);
    expect(screen.queryByRole("option", { name: "การผลิต" })).not.toBeInTheDocument();
  });

  it("does not offer to add a text that matches an existing type, ignoring case and spaces", async () => {
    render(<Harness />);

    await openAndSearch("  การผลิต  ");

    expect(screen.queryByText(/^\+ เพิ่ม/)).not.toBeInTheDocument();
  });

  it("offers to add a custom type and selects it", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const user = await openAndSearch("  ซ่อมรถยนต์พิเศษ ");

    expect(await screen.findByText("ไม่พบตัวเลือกที่ตรงกัน")).toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: '+ เพิ่ม "ซ่อมรถยนต์พิเศษ"' }));

    expect(onChange).toHaveBeenCalledWith("ซ่อมรถยนต์พิเศษ");
  });
});
