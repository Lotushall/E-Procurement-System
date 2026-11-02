import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TorBiddingWindow } from "@/components/tor-bidding-window";
import { freezeTimeAt } from "@/tests/helpers/time";

// ตอนนี้ = 2 พ.ย. 2026 10:00 น. เวลาไทย
freezeTimeAt("2026-11-02T10:00:00+07:00");

describe("TorBiddingWindow — range", () => {
  it("says the window is not set yet when there is no end date", () => {
    render(<TorBiddingWindow status="draft" biddingStartAt={null} biddingEndAt={null} />);
    expect(screen.getByText("ยังไม่กำหนด")).toBeInTheDocument();
  });

  it("shows a dash for a cancelled TOR with no end date", () => {
    render(<TorBiddingWindow status="cancelled" biddingStartAt={null} biddingEndAt={null} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("starts the range at publication when there is no start date", () => {
    render(<TorBiddingWindow status="draft" biddingStartAt={null} biddingEndAt="2026-11-20T16:30:00+07:00" />);
    expect(screen.getByText("เมื่อประกาศ – 20 พ.ย. 26")).toBeInTheDocument();
  });

  it("omits the start year when both dates are in the same year", () => {
    render(
      <TorBiddingWindow
        status="draft"
        biddingStartAt="2026-11-10T08:30:00+07:00"
        biddingEndAt="2026-11-20T16:30:00+07:00"
      />,
    );
    expect(screen.getByText("10 พ.ย. – 20 พ.ย. 26")).toBeInTheDocument();
  });

  it("shows both years when the window crosses a year", () => {
    render(
      <TorBiddingWindow
        status="draft"
        biddingStartAt="2026-12-25T08:30:00+07:00"
        biddingEndAt="2027-01-10T16:30:00+07:00"
      />,
    );
    expect(screen.getByText("25 ธ.ค. 26 – 10 ม.ค. 27")).toBeInTheDocument();
  });

  it("strikes through the range of a cancelled TOR and shows no hint", () => {
    render(
      <TorBiddingWindow
        status="cancelled"
        biddingStartAt="2026-11-10T08:30:00+07:00"
        biddingEndAt="2026-11-20T16:30:00+07:00"
      />,
    );
    const range = screen.getByText("10 พ.ย. – 20 พ.ย. 26");
    expect(range).toHaveClass("line-through");
    expect(range.nextElementSibling).toBeNull();
  });
});

describe("TorBiddingWindow — phase hint", () => {
  const start = "2026-11-10T08:30:00+07:00";
  const end = "2026-11-20T16:30:00+07:00";

  it.each(["draft", "in_review", "revision_required", "approved"] as const)("shows a schedule for %s", (status) => {
    render(<TorBiddingWindow status={status} biddingStartAt={start} biddingEndAt={end} />);
    expect(screen.getByText("กำหนดการ")).toBeInTheDocument();
  });

  it("counts down to the start of bidding when published", () => {
    render(<TorBiddingWindow status="published" biddingStartAt="2026-11-05T08:30:00+07:00" biddingEndAt={end} />);
    expect(screen.getByText("เริ่มรับซองในอีก 3 วัน")).toBeInTheDocument();
  });

  it("says bidding starts today when the start date is today", () => {
    render(<TorBiddingWindow status="published" biddingStartAt="2026-11-02T13:00:00+07:00" biddingEndAt={end} />);
    expect(screen.getByText("เริ่มรับซองวันนี้")).toBeInTheDocument();
  });

  it("shows days left while bidding is open", () => {
    render(<TorBiddingWindow status="bidding" biddingStartAt={null} biddingEndAt="2026-11-12T16:30:00+07:00" />);
    expect(screen.getByText("เหลือ 10 วัน")).toBeInTheDocument();
  });

  it("warns when less than a day is left", () => {
    render(<TorBiddingWindow status="bidding" biddingStartAt={null} biddingEndAt="2026-11-02T16:30:00+07:00" />);
    expect(screen.getByText("เหลือไม่ถึง 1 วัน")).toHaveClass("text-red-600");
  });

  it("says the deadline has passed when bidding is still open after the end date", () => {
    render(<TorBiddingWindow status="bidding" biddingStartAt={null} biddingEndAt="2026-11-01T16:30:00+07:00" />);
    expect(screen.getByText("ครบกำหนดยื่นแล้ว")).toBeInTheDocument();
  });

  it.each(["closed", "no_bidder", "awarded", "completed"] as const)("says bidding has ended for %s", (status) => {
    render(<TorBiddingWindow status={status} biddingStartAt={start} biddingEndAt={end} />);
    expect(screen.getByText("ปิดรับแล้ว")).toBeInTheDocument();
  });
});
