import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalList, LegalSection } from "@/components/legal/legal-section";

describe("LegalSection", () => {
  it("renders the title as a heading with its content", () => {
    render(
      <LegalSection title="1. บททั่วไป">
        <p>เนื้อหา</p>
      </LegalSection>,
    );

    expect(screen.getByRole("heading", { level: 3, name: "1. บททั่วไป" })).toBeInTheDocument();
    expect(screen.getByText("เนื้อหา")).toBeInTheDocument();
  });
});

describe("LegalList", () => {
  it("renders one list item per entry", () => {
    render(<LegalList items={["ข้อหนึ่ง", <b key="b">ข้อสอง</b>]} />);

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("ข้อหนึ่ง");
    expect(items[1]).toHaveTextContent("ข้อสอง");
  });

  it("renders an empty list for no items", () => {
    render(<LegalList items={[]} />);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
