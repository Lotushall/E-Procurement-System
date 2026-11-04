import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DepartmentSelect } from "@/components/department-select";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";

const DEPARTMENTS = [
  makeDepartment({ id: 1, name: "จัดซื้อ" }),
  makeDepartment({ id: 2, name: "บัญชี" }),
  makeDepartment({ id: 3, name: "วิศวกรรม" }),
];
const ALL = { value: "all", label: "ทุกแผนก" };

type Props = Partial<React.ComponentProps<typeof DepartmentSelect>>;

function setup(props: Props = {}) {
  const onValueChange = vi.fn();
  const view = render(
    <DepartmentSelect departments={DEPARTMENTS} value="" onValueChange={onValueChange} {...props} />,
  );
  return { onValueChange, user: userEvent.setup(), ...view };
}

const trigger = () => screen.getByRole("combobox");

describe("DepartmentSelect — default mode", () => {
  it("shows the dash option when no department is chosen", () => {
    setup({ value: "" });

    expect(trigger()).toHaveTextContent("---");
  });

  it("shows the name of the chosen department", () => {
    setup({ value: "2" });

    expect(trigger()).toHaveTextContent("บัญชี");
  });

  it("shows the default placeholder for a value that matches no department", () => {
    setup({ value: "999" });

    expect(trigger()).toHaveTextContent("เลือกแผนก");
  });

  it("shows a custom placeholder for a value that matches no department", () => {
    setup({ value: "999", placeholder: "เลือกหน่วยงาน" });

    expect(trigger()).toHaveTextContent("เลือกหน่วยงาน");
  });

  it("lists the dash option followed by every department when opened", async () => {
    const { user } = setup();

    await user.click(trigger());

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["---", "จัดซื้อ", "บัญชี", "วิศวกรรม"]);
    expect(screen.getByPlaceholderText("ค้นหาแผนก")).toBeInTheDocument();
  });

  it("reports the id of the chosen department as a string", async () => {
    const { user, onValueChange } = setup();

    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "วิศวกรรม" }));

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

    await user.type(await screen.findByPlaceholderText("ค้นหาแผนก"), "บัญ");

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["บัญชี"]);
  });

  it("shows the empty text when nothing matches the search", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาแผนก"), "ไม่มีแผนกนี้");

    expect(await screen.findByText("ไม่พบแผนกที่ค้นหา")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("offers only the dash option when there are no departments yet", async () => {
    const { user } = setup({ departments: [] });

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

describe("DepartmentSelect — allOption (filter usage)", () => {
  it("shows the all option label when selected and no placeholder is given", () => {
    setup({ value: "all", allOption: ALL });

    expect(trigger()).toHaveTextContent("ทุกแผนก");
  });

  it("shows the placeholder instead of the all label while nothing is filtered", () => {
    setup({ value: "all", allOption: ALL, placeholder: "แผนก" });

    expect(trigger()).toHaveTextContent("แผนก");
    expect(trigger()).not.toHaveTextContent("ทุกแผนก");
  });

  it("still shows the department name when one is filtered, even with a placeholder", () => {
    setup({ value: "3", allOption: ALL, placeholder: "แผนก" });

    expect(trigger()).toHaveTextContent("วิศวกรรม");
  });

  it("lists the all option instead of the dash option", async () => {
    const { user } = setup({ value: "all", allOption: ALL });

    await user.click(trigger());

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกแผนก", "จัดซื้อ", "บัญชี", "วิศวกรรม"]);
  });

  it("reports the all option value when it is chosen", async () => {
    const { user, onValueChange } = setup({ value: "2", allOption: ALL });

    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "ทุกแผนก" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("all");
  });

  it("reports a department id when one is chosen", async () => {
    const { user, onValueChange } = setup({ value: "all", allOption: ALL });

    await user.click(trigger());
    await user.click(await screen.findByRole("option", { name: "จัดซื้อ" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("1");
  });
});

describe("DepartmentSelect — inlineSearch", () => {
  it("renders a text field instead of a trigger button, with the placeholder", () => {
    setup({ inlineSearch: true, value: "all", allOption: ALL, placeholder: "แผนก" });

    const input = screen.getByRole("combobox");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("placeholder", "แผนก");
    expect(screen.queryByPlaceholderText("ค้นหาแผนก")).not.toBeInTheDocument();
  });

  it("falls back to the default placeholder", () => {
    setup({ inlineSearch: true, value: "999" });

    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "เลือกแผนก");
  });

  it("filters while typing into the field and reports the chosen id", async () => {
    const { user, onValueChange } = setup({ inlineSearch: true, value: "999" });

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "วิศ");
    const popup = await screen.findByRole("listbox");
    expect(within(popup).getAllByRole("option").map((o) => o.textContent)).toEqual(["วิศวกรรม"]);
    await user.click(within(popup).getByRole("option", { name: "วิศวกรรม" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("3");
  });

  it("shows the empty text when nothing matches what was typed", async () => {
    const { user } = setup({ inlineSearch: true, value: "999" });

    await user.type(screen.getByRole("combobox"), "ไม่มี");

    expect(await screen.findByText("ไม่พบแผนกที่ค้นหา")).toBeInTheDocument();
  });

  it("marks the field invalid when ariaInvalid is set", () => {
    setup({ inlineSearch: true, ariaInvalid: true });

    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
  });
});
