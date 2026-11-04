import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TenderProjectStatsCards } from "@/app/dashboard/tender-projects/_components/tender-project-stats-cards";
import { makeTenderProjectStats } from "@/tests/fixtures/tender-projects";

// การ์ดแต่ละใบ = ชื่อ (p แรก) + ค่า (p ที่สอง) ใน CardContent เดียวกัน
function valueOf(label: string): HTMLElement {
  const content = screen.getByText(label).parentElement!;
  return content.querySelectorAll("p")[1] as HTMLElement;
}

describe("TenderProjectStatsCards", () => {
  it("shows the four labels in order", () => {
    const { container } = render(<TenderProjectStatsCards stats={makeTenderProjectStats()} />);

    const labels = Array.from(container.querySelectorAll("p.truncate")).map((p) => p.textContent);
    expect(labels).toEqual(["โครงการทั้งหมด", "กำลังดำเนินการ", "เสร็จสิ้นแล้ว", "งบประมาณรวม"]);
  });

  it("shows the counts with thousands separators", () => {
    render(
      <TenderProjectStatsCards
        stats={makeTenderProjectStats({ totalCount: 1234, inProgressCount: 56, completedCount: 7890 })}
      />,
    );

    expect(valueOf("โครงการทั้งหมด")).toHaveTextContent("1,234");
    expect(valueOf("กำลังดำเนินการ")).toHaveTextContent("56");
    expect(valueOf("เสร็จสิ้นแล้ว")).toHaveTextContent("7,890");
  });

  it("shows zeros for an empty list", () => {
    render(<TenderProjectStatsCards stats={makeTenderProjectStats()} />);

    expect(valueOf("โครงการทั้งหมด")).toHaveTextContent("0");
    expect(valueOf("งบประมาณรวม")).toHaveTextContent("฿0");
  });

  it("abbreviates a budget of a million or more to millions and keeps the full amount in the tooltip", () => {
    render(<TenderProjectStatsCards stats={makeTenderProjectStats({ totalBudget: 294_540_000 })} />);

    const budget = valueOf("งบประมาณรวม");
    expect(budget).toHaveTextContent("฿294.54 ล้าน");
    expect(budget).toHaveAttribute("title", "฿294,540,000.00");
  });

  it("abbreviates exactly one million", () => {
    render(<TenderProjectStatsCards stats={makeTenderProjectStats({ totalBudget: 1_000_000 })} />);

    expect(valueOf("งบประมาณรวม")).toHaveTextContent("฿1 ล้าน");
  });

  it("shows a budget under a million in full", () => {
    render(<TenderProjectStatsCards stats={makeTenderProjectStats({ totalBudget: 320_000 })} />);

    const budget = valueOf("งบประมาณรวม");
    expect(budget).toHaveTextContent("฿320,000");
    expect(budget).toHaveAttribute("title", "฿320,000.00");
  });

  it("keeps up to two decimals on a small budget", () => {
    render(<TenderProjectStatsCards stats={makeTenderProjectStats({ totalBudget: 1234.56 })} />);

    expect(valueOf("งบประมาณรวม")).toHaveTextContent("฿1,234.56");
  });

  it("accepts sums sent as decimal strings", () => {
    render(
      <TenderProjectStatsCards
        stats={makeTenderProjectStats({ totalBudget: "5000000.00" as unknown as number, totalCount: "12" as unknown as number })}
      />,
    );

    expect(valueOf("งบประมาณรวม")).toHaveTextContent("฿5 ล้าน");
    expect(valueOf("โครงการทั้งหมด")).toHaveTextContent("12");
  });

  it("shows skeletons instead of values while pending, but keeps the labels", () => {
    const { container } = render(
      <TenderProjectStatsCards stats={makeTenderProjectStats({ totalCount: 99 })} isPending />,
    );

    expect(screen.getByText("โครงการทั้งหมด")).toBeInTheDocument();
    expect(screen.queryByText("99")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4);
  });
});
