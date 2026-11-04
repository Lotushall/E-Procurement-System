import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationBody } from "@/components/notification-item";
import type { NotificationItem } from "@/lib/notification/types";
import { freezeTimeAt } from "@/tests/helpers/time";

freezeTimeAt("2026-11-02T10:00:00+07:00");

function makeNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: "n1",
    type: "vendor_profile_approved",
    message: "ข้อมูลบริษัทของคุณได้รับการอนุมัติ",
    readAt: null,
    createdAt: "2026-11-02T09:00:00+07:00",
    ...overrides,
  };
}

describe("NotificationBody", () => {
  it("shows the message and the relative time", () => {
    render(<NotificationBody notification={makeNotification()} />);

    expect(screen.getByText("ข้อมูลบริษัทของคุณได้รับการอนุมัติ")).toBeInTheDocument();
    expect(screen.getByText("ประมาณ 1 ชั่วโมงที่ผ่านมา")).toBeInTheDocument();
  });

  it("uses the success tone for approved notifications", () => {
    const { container } = render(<NotificationBody notification={makeNotification()} />);

    expect(container.querySelector("span")).toHaveClass("bg-green-100", "text-green-700");
  });

  it("uses the danger tone for rejected notifications", () => {
    const { container } = render(
      <NotificationBody notification={makeNotification({ type: "vendor_document_rejected", message: "เอกสารถูกปฏิเสธ" })} />,
    );

    expect(screen.getByText("เอกสารถูกปฏิเสธ")).toBeInTheDocument();
    expect(container.querySelector("span")).toHaveClass("bg-red-100", "text-red-700");
  });

  it("falls back to the success tone with an icon for an unknown type", () => {
    const { container } = render(
      <NotificationBody notification={makeNotification({ type: "something_new" as never })} />,
    );

    expect(container.querySelector("span")).toHaveClass("bg-green-100");
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders no time text for an invalid date", () => {
    render(<NotificationBody notification={makeNotification({ createdAt: "not-a-date" })} />);

    expect(screen.queryByText(/ที่ผ่านมา/)).not.toBeInTheDocument();
  });
});
