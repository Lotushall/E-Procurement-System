import { describe, expect, it } from "vitest";
import { allowedNextStatuses, isTenderProjectLocked } from "@/lib/tender/tender-projects/status-rules";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";

const ALL: TenderProjectStatus[] = ["draft", "published", "closed", "completed", "cancelled", "archived"];

describe("allowedNextStatuses", () => {
  it.each(ALL)("lets an admin move from %s to every other status", (status) => {
    expect(allowedNextStatuses(status, true)).toEqual(ALL.filter((next) => next !== status));
  });

  it.each([
    ["draft", ["published", "cancelled"]],
    ["published", ["closed", "cancelled"]],
    ["closed", ["completed", "cancelled"]],
    ["completed", ["archived"]],
    ["cancelled", ["archived"]],
    ["archived", []],
  ] as const)("lets a non-admin move from %s only one step forward", (status, next) => {
    expect(allowedNextStatuses(status, false)).toEqual(next);
  });
});

describe("isTenderProjectLocked", () => {
  it.each(["completed", "cancelled", "archived"] as const)("locks a %s project for a non-admin", (status) => {
    expect(isTenderProjectLocked(status, false)).toBe(true);
  });

  it.each(["draft", "published", "closed"] as const)("leaves a %s project editable for a non-admin", (status) => {
    expect(isTenderProjectLocked(status, false)).toBe(false);
  });

  it.each(ALL)("never locks a %s project for an admin", (status) => {
    expect(isTenderProjectLocked(status, true)).toBe(false);
  });
});
