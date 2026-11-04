import { describe, expect, it } from "vitest";
import { allowedNextStatuses, isTenderProjectLocked } from "@/lib/tender/tender-projects/status-rules";
import type { TenderProjectStatus } from "@/lib/tender/tender-projects/types";

const ALL: TenderProjectStatus[] = ["draft", "published", "closed", "completed", "cancelled", "archived"];

describe("allowedNextStatuses", () => {
  it.each(ALL)("moves from %s to every other status with manageAnyStatus", (status) => {
    expect(allowedNextStatuses(status, true)).toEqual(ALL.filter((next) => next !== status));
  });

  it.each([
    ["draft", ["published", "cancelled"]],
    ["published", ["closed", "cancelled"]],
    ["closed", ["completed", "cancelled"]],
    ["completed", ["archived"]],
    ["cancelled", ["archived"]],
    ["archived", []],
  ] as const)("moves from %s only one step forward without manageAnyStatus", (status, next) => {
    expect(allowedNextStatuses(status, false)).toEqual(next);
  });
});

describe("isTenderProjectLocked", () => {
  it.each(["completed", "cancelled", "archived"] as const)("locks a %s project without manageAnyStatus", (status) => {
    expect(isTenderProjectLocked(status, false)).toBe(true);
  });

  it.each(["draft", "published", "closed"] as const)("leaves a %s project editable without manageAnyStatus", (status) => {
    expect(isTenderProjectLocked(status, false)).toBe(false);
  });

  it.each(ALL)("never locks a %s project with manageAnyStatus", (status) => {
    expect(isTenderProjectLocked(status, true)).toBe(false);
  });
});
