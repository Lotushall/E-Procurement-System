import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VerifyLayout from "@/app/(verify)/layout";

describe("VerifyLayout", () => {
  it("wraps the page in the auth card without any session check", () => {
    render(
      <VerifyLayout>
        <p>เนื้อหาหน้า</p>
      </VerifyLayout>,
    );

    expect(screen.getByText("เนื้อหาหน้า").closest('[data-slot="card"]')).toBeInTheDocument();
  });
});
