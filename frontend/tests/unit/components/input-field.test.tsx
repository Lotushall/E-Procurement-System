import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InputField } from "@/components/input-field";

describe("InputField", () => {
  it("renders the label and children without optional markers", () => {
    const { container } = render(
      <InputField label="ชื่อโครงการ">
        <input aria-label="name" />
      </InputField>,
    );

    expect(screen.getByText("ชื่อโครงการ")).toBeInTheDocument();
    expect(screen.getByLabelText("name")).toBeInTheDocument();
    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(container.querySelector("span.rounded-full")).toBeNull();
  });

  it("shows the required asterisk", () => {
    render(
      <InputField label="ชื่อ" required>
        <input />
      </InputField>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows the warning dot", () => {
    const { container } = render(
      <InputField label="ชื่อ" warning>
        <input />
      </InputField>,
    );
    expect(container.querySelector("span.rounded-full")).toBeInTheDocument();
  });

  it("shows the badge next to the label", () => {
    render(
      <InputField label="ชื่อ" badge={<span>ใหม่</span>}>
        <input />
      </InputField>,
    );
    expect(screen.getByText("ใหม่")).toBeInTheDocument();
  });

  it("shows the error message", () => {
    render(
      <InputField label="ชื่อ" error="กรุณากรอกชื่อ">
        <input />
      </InputField>,
    );
    expect(screen.getByText("กรุณากรอกชื่อ")).toBeInTheDocument();
  });

  it("applies the column span class for supported cols only", () => {
    const { container, rerender } = render(
      <InputField label="ชื่อ" cols={2}>
        <input />
      </InputField>,
    );
    expect(container.firstChild).toHaveClass("sm:col-span-2");

    rerender(
      <InputField label="ชื่อ" cols={9}>
        <input />
      </InputField>,
    );
    expect((container.firstChild as HTMLElement).className).not.toMatch(/col-span/);
  });

  it("uses a custom label class", () => {
    render(
      <InputField label="ชื่อ" labelClassName="text-lg">
        <input />
      </InputField>,
    );
    expect(screen.getByText("ชื่อ")).toHaveClass("text-lg");
  });
});
