import { describe, expect, it } from "vitest";
import { GROUP_LABELS, getGroupLabel } from "@/app/dashboard/users/roles-permissions/_data/group-labels";
import { makePermission } from "@/tests/fixtures/user-management";

describe("getGroupLabel", () => {
  it.each([
    ["vendors", "จัดการผู้ค้า"],
    ["users", "จัดการผู้ใช้"],
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

  // Backend seeds (AdminUserSeeder) permissions under tors.* and tender_projects.*,
  // but GROUP_LABELS has no entry for them, so the permission tab and picker show the raw key.
  it.skip("BUG: _data/group-labels.ts:1 GROUP_LABELS has no label for the seeded tors and tender_projects prefixes — it should map them to Thai labels", () => {
    expect(getGroupLabel("tors")).not.toBe("tors");
    expect(getGroupLabel("tender_projects")).not.toBe("tender_projects");
  });
});
