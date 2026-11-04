import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InputField } from "@/app/(auth)/_components/input-field";

describe("auth InputField", () => {
  it("shows the label with a required marker and its child", () => {
    render(
      <InputField label="อีเมล">
        <input aria-label="email-input" />
      </InputField>,
    );

    expect(screen.getByText("อีเมล")).toBeInTheDocument();
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByLabelText("email-input")).toBeInTheDocument();
  });

  it("shows the error message only when there is one", () => {
    const { rerender } = render(
      <InputField label="อีเมล">
        <input />
      </InputField>,
    );
    expect(screen.queryByText("อีเมลไม่ถูกต้อง")).not.toBeInTheDocument();

    rerender(
      <InputField label="อีเมล" error="อีเมลไม่ถูกต้อง">
        <input />
      </InputField>,
    );
    expect(screen.getByText("อีเมลไม่ถูกต้อง")).toBeInTheDocument();
  });

  it("spans both columns when full", () => {
    const { container } = render(
      <InputField label="ชื่อ" full>
        <input />
      </InputField>,
    );

    expect(container.firstElementChild).toHaveClass("sm:col-span-2");
  });

  it("does not span columns by default", () => {
    const { container } = render(
      <InputField label="ชื่อ">
        <input />
      </InputField>,
    );

    expect(container.firstElementChild).not.toHaveClass("sm:col-span-2");
  });

  it("applies a custom label class instead of the default", () => {
    render(
      <InputField label="ชื่อ" labelClassName="text-lg">
        <input />
      </InputField>,
    );

    expect(screen.getByText("ชื่อ")).toHaveClass("text-lg");
    expect(screen.getByText("ชื่อ")).not.toHaveClass("tracking-wider");
  });
});
