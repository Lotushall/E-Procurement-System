import { describe, expect, it } from "vitest";
import { formatNotificationTime, getNotificationMeta } from "@/lib/notification/utils";
import type { NotificationType } from "@/lib/notification/types";
import { routes } from "@/lib/routes";
import { freezeTimeAt } from "@/tests/helpers/time";

describe("getNotificationMeta", () => {
  it.each([
    ["vendor_document_approved", "success", routes.profiles.document],
    ["vendor_document_rejected", "danger", routes.profiles.document],
    ["vendor_profile_approved", "success", routes.profiles.profile],
    ["vendor_profile_rejected", "danger", routes.profiles.profile],
  ] as const)("maps %s to a %s notice linking to %s", (type, tone, href) => {
    expect(getNotificationMeta(type)).toMatchObject({ tone, href });
  });

  it("falls back to the notifications page for an unknown type", () => {
    expect(getNotificationMeta("something_new" as NotificationType)).toMatchObject({
      tone: "success",
      href: routes.notifications,
    });
  });
});

describe("formatNotificationTime", () => {
  freezeTimeAt("2026-11-02T10:00:00+07:00");

  it("shows how long ago in Thai", () => {
    expect(formatNotificationTime("2026-11-02T09:55:00+07:00")).toBe("5 นาทีที่ผ่านมา");
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatNotificationTime("not-a-date")).toBe("");
  });
});
