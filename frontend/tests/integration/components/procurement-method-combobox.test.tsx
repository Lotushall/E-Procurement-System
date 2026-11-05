import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProcurementMethodCombobox } from "@/components/procurement-method-combobox";
import { PROCUREMENT_METHODS } from "@/lib/tender/procurement-methods";

function Harness({ initial = "", onChange = vi.fn() }: { initial?: string; onChange?: (next: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <ProcurementMethodCombobox
      value={value}
      ariaInvalid={false}
      onValueChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

function setup(props: { initial?: string; onChange?: (next: string) => void } = {}) {
  const view = render(<Harness {...props} />);
  return { user: userEvent.setup(), ...view };
}

const trigger = () => screen.getByRole("combobox");

describe("ProcurementMethodCombobox", () => {
  it("shows the placeholder when the value is empty (\"\", the form default)", () => {
    setup();

    expect(trigger()).toHaveTextContent("เลือกวิธีจัดซื้อ");
  });

  it("offers exactly the procurement methods of the tender module", async () => {
    const { user } = setup();

    await user.click(trigger());

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(PROCUREMENT_METHODS);
  });

  it("reports the picked method and shows it as the value", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });

    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "คัดเลือก" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("คัดเลือก");
    expect(trigger()).toHaveTextContent("คัดเลือก");
  });

  it("shows an existing value that is not in the list", () => {
    setup({ initial: "วิธีพิเศษ" });

    expect(trigger()).toHaveTextContent("วิธีพิเศษ");
  });

  it("filters the options by the search text", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาวิธีจัดซื้อ"), "e-market");

    const options = await screen.findAllByRole("option", { name: /e-market/ });
    expect(options.map((o) => o.textContent)).toEqual(["ตลาดอิเล็กทรอนิกส์ (e-market)", '+ เพิ่ม "e-market"']);
    expect(screen.queryByRole("option", { name: "คัดเลือก" })).not.toBeInTheDocument();
  });

  it("offers to add a free-text method that is not in the list and reports it when chosen", async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาวิธีจัดซื้อ"), "วิธีใหม่");
    await user.click(await screen.findByRole("option", { name: '+ เพิ่ม "วิธีใหม่"' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("วิธีใหม่");
    expect(trigger()).toHaveTextContent("วิธีใหม่");
  });

  it("does not offer to add a method that already exists, ignoring case and surrounding spaces", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาวิธีจัดซื้อ"), " ตลาดอิเล็กทรอนิกส์ (E-MARKET) ");

    await screen.findByRole("option", { name: "ตลาดอิเล็กทรอนิกส์ (e-market)" });
    expect(screen.queryByRole("option", { name: /\+ เพิ่ม/ })).not.toBeInTheDocument();
  });

  it("shows the empty message and an add option when nothing matches", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาวิธีจัดซื้อ"), "zzz");

    expect(await screen.findByText("ไม่พบตัวเลือกที่ตรงกัน")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: '+ เพิ่ม "zzz"' })).toBeInTheDocument();
  });

  it("marks the trigger invalid when ariaInvalid is set", () => {
    render(<ProcurementMethodCombobox value="" onValueChange={vi.fn()} ariaInvalid />);

    expect(trigger()).toHaveAttribute("aria-invalid", "true");
  });
});
