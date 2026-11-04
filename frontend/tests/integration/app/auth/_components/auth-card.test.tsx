import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthCard } from "@/app/(auth)/_components/auth-card";
import { setUrl } from "@/tests/mocks/next-navigation";

const card = () => document.querySelector('[data-slot="card"]') as HTMLElement;

describe("AuthCard", () => {
  it("renders its children inside the card", () => {
    setUrl("/login");

    render(
      <AuthCard>
        <p>เนื้อหา</p>
      </AuthCard>,
    );

    expect(card()).toContainElement(screen.getByText("เนื้อหา"));
  });

  it("uses the narrow card on the login page", () => {
    setUrl("/login");

    render(<AuthCard>x</AuthCard>);

    expect(card()).toHaveClass("max-w-103");
    expect(card()).not.toHaveClass("max-w-160");
  });

  it("uses the wide card on the register page", () => {
    setUrl("/register");

    render(<AuthCard>x</AuthCard>);

    expect(card()).toHaveClass("max-w-160");
    expect(card()).not.toHaveClass("max-w-103");
  });
});
