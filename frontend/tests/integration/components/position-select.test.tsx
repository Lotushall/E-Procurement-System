import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PositionSelect } from "@/components/position-select";
import { makePosition } from "@/tests/fixtures/internal-profiles";

const POSITIONS = [
  makePosition({ id: 1, name: "เจ้าหน้าที่" }),
  makePosition({ id: 2, name: "หัวหน้าฝ่าย" }),
  makePosition({ id: 3, name: "ผู้จัดการ" }),
];
const ALL = { value: "all", label: "ทุกตำแหน่ง" };

type Props = Partial<React.ComponentProps<typeof PositionSelect>>;

function setup(props: Props = {}) {
  const onValueChange = vi.fn();
  const view = render(
    <PositionSelect positions={POSITIONS} value="" onValueChange={onValueChange} {...props} />,
  );
  return { onValueChange, user: userEvent.setup(), ...view };
}

const trigger = () => screen.getByRole("combobox");

describe("PositionSelect — default mode", () => {
  it("shows the dash option when no position is chosen", () => {
    setup({ value: "" });

    expect(trigger()).toHaveTextContent("---");
  });

  it("shows the name of the chosen position", () => {
    setup({ value: "2" });

    expect(trigger()).toHaveTextContent("หัวหน้าฝ่าย");
  });

  it("shows the default placeholder for a value that matches no position", () => {
    setup({ value: "999" });

    expect(trigger()).toHaveTextContent("เลือกตำแหน่ง");
  });

  it("shows a custom placeholder for a value that matches no position", () => {
    setup({ value: "999", placeholder: "เลือกระดับ" });

    expect(trigger()).toHaveTextContent("เลือกระดับ");
  });

  it("lists the dash option followed by every position when opened", async () => {
    const { user } = setup();

    await user.click(trigger());

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["---", "เจ้าหน้าที่", "หัวหน้าฝ่าย", "ผู้จัดการ"]);
    expect(screen.getByPlaceholderText("ค้นหาตำแหน่ง")).toBeInTheDocument();
  });

  it("reports the id of the chosen position as a string", async () => {
    const { user, onValueChange } = setup();

    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "ผู้จัดการ" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("3");
  });

  it("reports an empty string when the dash option is chosen", async () => {
    const { user, onValueChange } = setup({ value: "2" });

    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "---" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("");
  });

  it("filters the options by what is typed in the search box", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาตำแหน่ง"), "หัวหน้า");

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["หัวหน้าฝ่าย"]);
  });

  it("shows the empty text when nothing matches the search", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาตำแหน่ง"), "ไม่มีตำแหน่งนี้");

    expect(await screen.findByText("ไม่พบตำแหน่งที่ค้นหา")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("offers only the dash option when there are no positions yet", async () => {
    const { user } = setup({ positions: [] });

    await user.click(trigger());

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["---"]);
  });

  it("marks the trigger invalid when ariaInvalid is set", () => {
    setup({ ariaInvalid: true });

    expect(trigger()).toHaveAttribute("aria-invalid", "true");
  });

  it("applies the custom className to the trigger", () => {
    setup({ className: "lg:w-44" });

    expect(trigger()).toHaveClass("lg:w-44");
  });
});

describe("PositionSelect — allOption (filter usage)", () => {
  it("shows the all option label when selected and no placeholder is given", () => {
    setup({ value: "all", allOption: ALL });

    expect(trigger()).toHaveTextContent("ทุกตำแหน่ง");
  });

  it("shows the placeholder instead of the all label while nothing is filtered", () => {
    setup({ value: "all", allOption: ALL, placeholder: "ตำแหน่ง" });

    expect(trigger()).toHaveTextContent("ตำแหน่ง");
    expect(trigger()).not.toHaveTextContent("ทุกตำแหน่ง");
  });

  it("still shows the position name when one is filtered, even with a placeholder", () => {
    setup({ value: "3", allOption: ALL, placeholder: "ตำแหน่ง" });

    expect(trigger()).toHaveTextContent("ผู้จัดการ");
  });

  it("lists the all option instead of the dash option", async () => {
    const { user } = setup({ value: "all", allOption: ALL });

    await user.click(trigger());

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกตำแหน่ง", "เจ้าหน้าที่", "หัวหน้าฝ่าย", "ผู้จัดการ"]);
  });

  it("reports the all option value when it is chosen", async () => {
    const { user, onValueChange } = setup({ value: "2", allOption: ALL });

    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "ทุกตำแหน่ง" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("all");
  });

  it("reports a position id when one is chosen", async () => {
    const { user, onValueChange } = setup({ value: "all", allOption: ALL });

    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "เจ้าหน้าที่" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("1");
  });
});

describe("PositionSelect — inlineSearch", () => {
  it("renders a text field instead of a trigger button, with the placeholder", () => {
    setup({ inlineSearch: true, value: "all", allOption: ALL, placeholder: "ตำแหน่ง" });

    const input = screen.getByRole("combobox");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("placeholder", "ตำแหน่ง");
    expect(screen.queryByPlaceholderText("ค้นหาตำแหน่ง")).not.toBeInTheDocument();
  });

  it("falls back to the default placeholder", () => {
    setup({ inlineSearch: true, value: "999" });

    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "เลือกตำแหน่ง");
  });

  it("filters while typing into the field and reports the chosen id", async () => {
    const { user, onValueChange } = setup({ inlineSearch: true, value: "999" });

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "ผู้จัด");
    const popup = await screen.findByRole("listbox");
    expect(within(popup).getAllByRole("option").map((o) => o.textContent)).toEqual(["ผู้จัดการ"]);
    await user.click(within(popup).getByRole("option", { name: "ผู้จัดการ" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("3");
  });

  it("shows the empty text when nothing matches what was typed", async () => {
    const { user } = setup({ inlineSearch: true, value: "999" });

    await user.type(screen.getByRole("combobox"), "ไม่มี");

    expect(await screen.findByText("ไม่พบตำแหน่งที่ค้นหา")).toBeInTheDocument();
  });

  it("marks the field invalid when ariaInvalid is set", () => {
    setup({ inlineSearch: true, ariaInvalid: true });

    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
  });
});
