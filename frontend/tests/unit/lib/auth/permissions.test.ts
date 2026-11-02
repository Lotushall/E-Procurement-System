import { describe, expect, it } from "vitest";
import {
  hasAllPermissions,
  hasAllRoles,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
} from "@/lib/auth/permissions";
import { makeUser } from "@/tests/fixtures/users";

const user = makeUser({
  roles: ["procurement_officer"],
  permissions: ["tor.view", "tor.create"],
});

describe("hasRole", () => {
  it("returns true for an assigned role", () => {
    expect(hasRole(user, "procurement_officer")).toBe(true);
  });

  it("returns false for a role the user does not have", () => {
    expect(hasRole(user, "admin")).toBe(false);
  });
});

describe("hasAnyRole", () => {
  it("returns true when at least one role matches", () => {
    expect(hasAnyRole(user, ["admin", "procurement_officer"])).toBe(true);
  });

  it("returns false when no role matches", () => {
    expect(hasAnyRole(user, ["admin"])).toBe(false);
  });

  it("returns false for an empty list", () => {
    expect(hasAnyRole(user, [])).toBe(false);
  });
});

describe("hasAllRoles", () => {
  it("returns true when every role matches", () => {
    expect(hasAllRoles(user, ["procurement_officer"])).toBe(true);
  });

  it("returns false when any role is missing", () => {
    expect(hasAllRoles(user, ["procurement_officer", "admin"])).toBe(false);
  });
});

describe("hasPermission", () => {
  it("returns true for a granted permission", () => {
    expect(hasPermission(user, "tor.view")).toBe(true);
  });

  it("returns false for a permission the user does not have", () => {
    expect(hasPermission(user, "tor.delete")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("returns true when at least one permission matches", () => {
    expect(hasAnyPermission(user, ["tor.delete", "tor.create"])).toBe(true);
  });

  it("returns false when no permission matches", () => {
    expect(hasAnyPermission(user, ["tor.delete"])).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("returns true when every permission matches", () => {
    expect(hasAllPermissions(user, ["tor.view", "tor.create"])).toBe(true);
  });

  it("returns false when any permission is missing", () => {
    expect(hasAllPermissions(user, ["tor.view", "tor.delete"])).toBe(false);
  });
});

describe("without a user", () => {
  it.each([null, undefined])("denies every check when user is %s", (missing) => {
    expect(hasRole(missing, "admin")).toBe(false);
    expect(hasAnyRole(missing, ["admin"])).toBe(false);
    expect(hasPermission(missing, "tor.view")).toBe(false);
    expect(hasAnyPermission(missing, ["tor.view"])).toBe(false);
  });
});
