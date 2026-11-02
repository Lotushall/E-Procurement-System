import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TenderProjectPeriod } from "@/components/tender-project-period";
import { freezeTimeAt } from "@/tests/helpers/time";

// ตอนนี้ = 2 พ.ย. 2026 10:00 น. เวลาไทย
freezeTimeAt("2026-11-02T10:00:00+07:00");

describe("TenderProjectPeriod — period", () => {
  it("says the period is not set when there are no dates", () => {
    render(<TenderProjectPeriod status="draft" />);
    expect(screen.getByText("ยังไม่กำหนดระยะเวลา")).toBeInTheDocument();
  });

  it("shows the start and end dates", () => {
    render(
      <TenderProjectPeriod status="draft" projectStartAt="2026-10-01T00:00:00+07:00" projectEndAt="2026-12-31T00:00:00+07:00" />,
    );
    expect(screen.getByText("1 ต.ค. 26 – 31 ธ.ค. 26")).toBeInTheDocument();
  });

  it("notes a missing end date", () => {
    render(<TenderProjectPeriod status="draft" projectStartAt="2026-10-01T00:00:00+07:00" />);
    expect(screen.getByText("เริ่ม 1 ต.ค. 26 · ยังไม่กำหนดวันสิ้นสุด")).toBeInTheDocument();
  });

  it("shows only the end date when there is no start date", () => {
    render(<TenderProjectPeriod status="draft" projectEndAt="2026-12-31T00:00:00+07:00" />);
    expect(screen.getByText("สิ้นสุด 31 ธ.ค. 26")).toBeInTheDocument();
  });
});

describe("TenderProjectPeriod — hint", () => {
  it.each(["completed", "cancelled", "archived"] as const)("says %s projects have ended", (status) => {
    render(<TenderProjectPeriod status={status} projectEndAt="2027-06-30T00:00:00+07:00" />);
    expect(screen.getByText("สิ้นสุดแล้ว")).toBeInTheDocument();
  });

  it("counts down to a future start date", () => {
    render(<TenderProjectPeriod status="published" projectStartAt="2026-11-12T00:00:00+07:00" />);
    expect(screen.getByText("เริ่มในอีก 10 วัน")).toBeInTheDocument();
  });

  it("shows how many days the project is overdue", () => {
    render(<TenderProjectPeriod status="published" projectEndAt="2026-10-30T00:00:00+07:00" />);
    expect(screen.getByText("เลยกำหนด 3 วัน")).toHaveClass("text-red-700");
  });

  it("says the project ends today", () => {
    render(<TenderProjectPeriod status="published" projectEndAt="2026-11-02T23:00:00+07:00" />);
    expect(screen.getByText("สิ้นสุดวันนี้")).toBeInTheDocument();
  });

  it("shows days left within 30 days", () => {
    render(<TenderProjectPeriod status="published" projectEndAt="2026-12-02T00:00:00+07:00" />);
    expect(screen.getByText("เหลือ 30 วัน")).toHaveClass("text-orange-700");
  });

  it("shows months left beyond 30 days", () => {
    render(<TenderProjectPeriod status="published" projectEndAt="2027-03-15T00:00:00+07:00" />);
    expect(screen.getByText("เหลือ 4 เดือน")).toHaveClass("text-blue-700");
  });

  it("shows no hint without an end date once started", () => {
    render(<TenderProjectPeriod status="published" projectStartAt="2026-10-01T00:00:00+07:00" />);
    expect(screen.queryByText(/เหลือ|เลยกำหนด|สิ้นสุด(แล้ว|วันนี้)/)).not.toBeInTheDocument();
  });
});
