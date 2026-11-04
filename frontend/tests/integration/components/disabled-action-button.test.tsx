import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download } from "lucide-react";
import { describe, expect, it } from "vitest";
import { DisabledActionButton } from "@/components/disabled-action-button";

describe("DisabledActionButton", () => {
  it("renders a disabled button with the aria-label", () => {
    render(<DisabledActionButton icon={Download} label="ส่งออก" />);

    expect(screen.getByRole("button", { name: "ส่งออก" })).toBeDisabled();
  });

  it("uses the default icon class, or a custom one", () => {
    const { rerender } = render(<DisabledActionButton icon={Download} label="ส่งออก" />);
    expect(screen.getByRole("button", { name: "ส่งออก" }).querySelector("svg")).toHaveClass("text-gray-500");

    rerender(<DisabledActionButton icon={Download} label="ส่งออก" iconClassName="size-6 text-red-600" />);
    const svg = screen.getByRole("button", { name: "ส่งออก" }).querySelector("svg");
    expect(svg).toHaveClass("text-red-600");
    expect(svg).not.toHaveClass("text-gray-500");
  });

  it("shows the coming-soon tooltip when the wrapper is hovered", async () => {
    const user = userEvent.setup();
    const { container } = render(<DisabledActionButton icon={Download} label="ส่งออก" />);
    expect(screen.queryByText("ฟีเจอร์นี้ยังไม่เปิดใช้งาน")).not.toBeInTheDocument();

    await user.hover(container.querySelector("span[tabindex='0']")!);

    expect(await screen.findByText("ฟีเจอร์นี้ยังไม่เปิดใช้งาน")).toBeInTheDocument();
  });

  it("shows the coming-soon tooltip when the wrapper is focused", async () => {
    const user = userEvent.setup();
    render(<DisabledActionButton icon={Download} label="ส่งออก" />);

    await user.tab();

    expect(await screen.findByText("ฟีเจอร์นี้ยังไม่เปิดใช้งาน")).toBeInTheDocument();
  });
});
