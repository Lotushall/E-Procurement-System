import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PermissionPicker } from "@/components/permission-picker";
import type { Permission } from "@/lib/user/management/types";
import { makePermission } from "@/tests/fixtures/user-management";

const PERMISSIONS: Permission[] = [
  makePermission({ name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users" }),
  makePermission({ name: "users.create", label: "สร้างผู้ใช้", group: "users" }),
  makePermission({ name: "vendors.approve", label: "อนุมัติผู้ค้า", group: "vendors" }),
  makePermission({ name: "vendors.reject", label: "ปฏิเสธผู้ค้า", group: "vendors" }),
  makePermission({ name: "reports.view", label: "ดูรายงาน", group: "reports" }),
];

function setup(value: string[] = [], permissions = PERMISSIONS) {
  const onChange = vi.fn();
  const view = render(<PermissionPicker permissions={permissions} value={value} onChange={onChange} />);
  return { onChange, user: userEvent.setup(), ...view };
}

// กลุ่มหนึ่งคือ div ที่มีหัวข้อ <p> อยู่ข้างใน
function group(title: string) {
  return screen.getByText(title, { selector: "p" }).closest("div.flex-col") as HTMLElement;
}

function Controlled({ initial = [] as string[], seen }: { initial?: string[]; seen: (v: string[]) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <PermissionPicker
      permissions={PERMISSIONS}
      value={value}
      onChange={(next) => {
        seen(next);
        setValue(next);
      }}
    />
  );
}

describe("PermissionPicker — layout", () => {
  it("groups permissions by the prefix of their name, in first-seen order", () => {
    setup();

    const headings = screen.getAllByText(/^(จัดการผู้ใช้|จัดการผู้ค้า|reports)$/, { selector: "p" });
    expect(headings.map((h) => h.textContent)).toEqual(["จัดการผู้ใช้", "จัดการผู้ค้า", "reports"]);
  });

  it("uses a Thai label for known groups and the raw prefix for unknown ones", () => {
    setup();

    expect(screen.getByText("จัดการผู้ใช้", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("จัดการผู้ค้า", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("reports", { selector: "p" })).toBeInTheDocument();
  });

  it("shows each permission's label and name inside its group", () => {
    setup();

    const users = within(group("จัดการผู้ใช้"));
    expect(users.getByText("ดูรายการผู้ใช้")).toBeInTheDocument();
    expect(users.getByText("users.viewAny")).toBeInTheDocument();
    expect(users.getByText("สร้างผู้ใช้")).toBeInTheDocument();
    expect(users.queryByText("อนุมัติผู้ค้า")).not.toBeInTheDocument();
    expect(within(group("จัดการผู้ค้า")).getAllByRole("checkbox")).toHaveLength(2);
  });

  it("renders nothing selectable when there are no permissions", () => {
    setup([], []);

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Select All" })).not.toBeInTheDocument();
  });
});

describe("PermissionPicker — checked state", () => {
  it("checks exactly the permissions in value", () => {
    setup(["users.create", "reports.view", "unknown.permission"]);

    expect(screen.getByRole("checkbox", { name: /users\.create/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /reports\.view/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /users\.viewAny/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /vendors\.approve/ })).not.toBeChecked();
  });

  it("checks nothing for an empty value", () => {
    setup();

    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
  });
});

describe("PermissionPicker — single permission", () => {
  it("adds a permission to the end of the value when checked", async () => {
    const { user, onChange } = setup(["users.viewAny"]);

    await user.click(screen.getByRole("checkbox", { name: /vendors\.reject/ }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["users.viewAny", "vendors.reject"]);
  });

  it("removes only that permission when unchecked", async () => {
    const { user, onChange } = setup(["users.viewAny", "users.create", "reports.view"]);

    await user.click(screen.getByRole("checkbox", { name: /users\.create/ }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["users.viewAny", "reports.view"]);
  });

  it("toggles when the label text is clicked", async () => {
    const { user, onChange } = setup();

    await user.click(screen.getByText("ดูรายงาน"));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["reports.view"]);
  });
});

describe("PermissionPicker — whole group", () => {
  it("Select All adds every permission of that group only", async () => {
    const { user, onChange } = setup(["reports.view"]);

    await user.click(within(group("จัดการผู้ค้า")).getByRole("button", { name: "Select All" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["reports.view", "vendors.approve", "vendors.reject"]);
  });

  it("Select All does not duplicate permissions that are already selected", async () => {
    const { user, onChange } = setup(["users.create"]);

    await user.click(within(group("จัดการผู้ใช้")).getByRole("button", { name: "Select All" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["users.create", "users.viewAny"]);
  });

  it("Clear All removes every permission of that group and keeps the rest", async () => {
    const { user, onChange } = setup(["users.viewAny", "vendors.approve", "users.create", "reports.view"]);

    await user.click(within(group("จัดการผู้ใช้")).getByRole("button", { name: "Clear All" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["vendors.approve", "reports.view"]);
  });

  it("Clear All on a group with nothing selected leaves the value unchanged", async () => {
    const { user, onChange } = setup(["reports.view"]);

    await user.click(within(group("จัดการผู้ค้า")).getByRole("button", { name: "Clear All" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["reports.view"]);
  });
});

describe("PermissionPicker — controlled round trip", () => {
  it("reflects select all, a single uncheck and clear all in the checkboxes", async () => {
    const seen = vi.fn();
    render(<Controlled seen={seen} />);
    const user = userEvent.setup();
    const users = () => within(group("จัดการผู้ใช้"));

    await user.click(users().getByRole("button", { name: "Select All" }));
    expect(users().getAllByRole("checkbox").every((c) => c.getAttribute("aria-checked") === "true")).toBe(true);

    await user.click(screen.getByRole("checkbox", { name: /users\.create/ }));
    expect(screen.getByRole("checkbox", { name: /users\.create/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /users\.viewAny/ })).toBeChecked();

    await user.click(users().getByRole("button", { name: "Clear All" }));
    expect(users().getAllByRole("checkbox").some((c) => c.getAttribute("aria-checked") === "true")).toBe(false);
    expect(seen).toHaveBeenLastCalledWith([]);
  });
});
