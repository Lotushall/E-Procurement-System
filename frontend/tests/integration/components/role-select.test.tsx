import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RoleSelect } from "@/components/role-select";
import { makeRole } from "@/tests/fixtures/user-management";

const ROLES = [makeRole({ id: 1, name: "admin" }), makeRole({ id: 2, name: "officer" }), makeRole({ id: 3, name: "auditor" })];

function setup(props: Partial<React.ComponentProps<typeof RoleSelect>> = {}) {
  const onValueChange = vi.fn();
  const view = render(<RoleSelect roles={ROLES} value="" onValueChange={onValueChange} {...props} />);
  return { onValueChange, user: userEvent.setup(), ...view };
}

describe("RoleSelect", () => {
  it("shows the placeholder while no role is selected", () => {
    setup();

    expect(screen.getByRole("combobox")).toHaveTextContent("เลือก role");
  });

  it("shows the name of the selected role", () => {
    setup({ value: "officer" });

    expect(screen.getByRole("combobox")).toHaveTextContent("officer");
  });

  it("lists every role as an option", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("combobox"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["admin", "officer", "auditor"]);
  });

  it("reports the name of the chosen role", async () => {
    const { user, onValueChange } = setup({ value: "admin" });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "auditor" }));

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("auditor");
  });

  it("offers no options when there are no roles", async () => {
    const { user } = setup({ roles: [] });

    await user.click(screen.getByRole("combobox"));

    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("marks the trigger invalid when ariaInvalid is set", () => {
    setup({ ariaInvalid: true });

    expect(screen.getByRole("combobox")).toBeInvalid();
  });

  it("is valid by default", () => {
    setup();

    expect(screen.getByRole("combobox")).toBeValid();
  });
});
