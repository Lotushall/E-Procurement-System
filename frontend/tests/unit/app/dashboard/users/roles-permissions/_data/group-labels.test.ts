import { describe, expect, it } from "vitest";
import { GROUP_LABELS, getGroupLabel } from "@/app/dashboard/users/roles-permissions/_data/group-labels";
import { makePermission } from "@/tests/fixtures/user-management";

describe("getGroupLabel", () => {
  // ครบทุก prefix ที่ AdminUserSeeder สร้าง
  it.each([
    ["vendors", "จัดการผู้ค้า"],
    ["users", "จัดการผู้ใช้"],
    ["tender_projects", "จัดการโครงการจัดซื้อจัดจ้าง"],
    ["tors", "จัดการ TOR"],
  ])("maps the %s prefix to its Thai label", (prefix, label) => {
    expect(getGroupLabel(prefix)).toBe(label);
  });

  it("maps the prefix used by the shared permission fixture", () => {
    const { group } = makePermission();

    expect(GROUP_LABELS).toHaveProperty(group);
    expect(getGroupLabel(group)).toBe("จัดการผู้ใช้");
  });

  it("falls back to the raw prefix for an unknown group", () => {
    expect(getGroupLabel("reports")).toBe("reports");
  });
});
