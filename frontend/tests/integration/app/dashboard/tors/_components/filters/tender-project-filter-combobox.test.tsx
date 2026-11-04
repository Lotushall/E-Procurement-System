import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TenderProjectFilterCombobox } from "@/app/dashboard/tors/_components/filters/tender-project-filter-combobox";
import { makeTenderProjectOption } from "@/tests/fixtures/tender-projects";

const PROJECTS = [
  makeTenderProjectOption({ id: 7, projectCode: "TP-2569-007", name: "จัดซื้อคอมพิวเตอร์" }),
  makeTenderProjectOption({ id: 8, projectCode: "TP-2569-008", name: "จัดซื้อโต๊ะทำงาน" }),
];
const PROJECT_7 = "TP-2569-007 · จัดซื้อคอมพิวเตอร์";
const PROJECT_8 = "TP-2569-008 · จัดซื้อโต๊ะทำงาน";

type Props = React.ComponentProps<typeof TenderProjectFilterCombobox>;

function setup(props: Partial<Props> = {}) {
  const onValueChange = vi.fn();
  const view = render(
    <TenderProjectFilterCombobox projects={PROJECTS} value={undefined} onValueChange={onValueChange} {...props} />,
  );
  return { onValueChange, user: userEvent.setup(), ...view };
}

const trigger = () => screen.getByRole("combobox");
const labelOf = (c: HTMLElement) => (c.textContent ?? "").replace("▼", "");

describe("TenderProjectFilterCombobox — shown value", () => {
  it("shows the placeholder while no project filter is set", () => {
    setup();

    expect(labelOf(trigger())).toBe("โครงการ");
  });

  it("shows the no-project choice when the value is none", () => {
    setup({ value: "none" });

    expect(labelOf(trigger())).toBe("ไม่สังกัดโครงการ");
  });

  it("shows code and name of the chosen project", () => {
    setup({ value: 8 });

    expect(labelOf(trigger())).toBe(PROJECT_8);
  });

  it("shows the placeholder for an id that is not in the options (still loading or removed)", () => {
    setup({ value: 999 });

    expect(labelOf(trigger())).toBe("โครงการ");
  });

  it("shows the placeholder for a known id when the options are empty", () => {
    setup({ value: 7, projects: [] });

    expect(labelOf(trigger())).toBe("โครงการ");
  });
});

describe("TenderProjectFilterCombobox — options", () => {
  it("offers all projects, no project, then every project option", async () => {
    const { user } = setup();

    await user.click(trigger());

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกโครงการ", "ไม่สังกัดโครงการ", PROJECT_7, PROJECT_8]);
  });

  it("offers only the two fixed choices when the project options are not available", async () => {
    const { user } = setup({ projects: [] });

    await user.click(trigger());

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกโครงการ", "ไม่สังกัดโครงการ"]);
  });

  it("filters the options by the search text", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาโครงการ"), "TP-2569-008");

    expect(await screen.findByRole("option", { name: PROJECT_8 })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: PROJECT_7 })).not.toBeInTheDocument();
  });

  it("shows the empty message when nothing matches", async () => {
    const { user } = setup();
    await user.click(trigger());

    await user.type(await screen.findByPlaceholderText("ค้นหาโครงการ"), "zzz");

    expect(await screen.findByText("ไม่พบโครงการที่ค้นหา")).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});

describe("TenderProjectFilterCombobox — choosing", () => {
  it("reports the id of the chosen project as a number", async () => {
    const { user, onValueChange } = setup();
    await user.click(trigger());

    await user.click(await screen.findByRole("option", { name: PROJECT_7 }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(7);
  });

  it("reports none for TORs outside any project", async () => {
    const { user, onValueChange } = setup();
    await user.click(trigger());

    await user.click(await screen.findByRole("option", { name: "ไม่สังกัดโครงการ" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("none");
  });

  it("reports undefined when all projects is chosen", async () => {
    const { user, onValueChange } = setup({ value: 7 });
    await user.click(trigger());

    await user.click(await screen.findByRole("option", { name: "ทุกโครงการ" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});

describe("TenderProjectFilterCombobox — inline search (in a sheet)", () => {
  it("types into the field itself instead of a popup search box", async () => {
    const { user } = setup({ inlineSearch: true });

    const input = screen.getByPlaceholderText("โครงการ");
    await user.click(input);

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกโครงการ", "ไม่สังกัดโครงการ", PROJECT_7, PROJECT_8]);
    expect(screen.queryByPlaceholderText("ค้นหาโครงการ")).not.toBeInTheDocument();
  });

  it("reports a project picked after typing into the field", async () => {
    const { user, onValueChange } = setup({ inlineSearch: true });

    await user.type(screen.getByPlaceholderText("โครงการ"), "โต๊ะ");
    await user.click(await screen.findByRole("option", { name: PROJECT_8 }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(8);
  });
});

describe("TenderProjectFilterCombobox — styling hook", () => {
  it("applies the extra class name to the trigger", () => {
    setup({ className: "lg:w-60" });

    expect(trigger()).toHaveClass("lg:w-60");
  });
});
