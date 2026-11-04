import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Forbidden } from "@/components/forbidden";

describe("Forbidden", () => {
  it("shows the 403 message and explanation", () => {
    render(<Forbidden />);

    expect(screen.getByRole("heading", { name: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้" })).toBeInTheDocument();
    expect(screen.getByText("คุณพยายามเข้าถึงหน้าที่คุณไม่ได้รับอนุญาตให้เข้าถึง")).toBeInTheDocument();
  });

  it("shows the 403 illustration", () => {
    render(<Forbidden />);

    expect(screen.getByRole("img", { name: "Forbidden" })).toHaveAttribute("src", expect.stringContaining("403.svg"));
  });
});
