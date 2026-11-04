import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/(public)/page";

describe("public home page", () => {
  it("renders the placeholder content", () => {
    render(<Home />);

    expect(screen.getByText("hello world")).toBeInTheDocument();
  });
});
