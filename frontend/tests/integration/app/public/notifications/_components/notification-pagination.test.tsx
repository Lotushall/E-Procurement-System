import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NotificationPagination } from "@/app/(public)/notifications/_components/notification-pagination";

describe("NotificationPagination", () => {
  it("renders nothing when there is a single page", () => {
    const { container } = render(<NotificationPagination currentPage={1} lastPage={1} onPageChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the page indicator and goes to the previous and next pages", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<NotificationPagination currentPage={2} lastPage={4} onPageChange={onPageChange} />);

    expect(screen.getByText("หน้า 2 จาก 4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ก่อนหน้า" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);

    await user.click(screen.getByRole("button", { name: "ถัดไป" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it("disables previous on the first page", () => {
    render(<NotificationPagination currentPage={1} lastPage={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "ก่อนหน้า" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ถัดไป" })).toBeEnabled();
  });

  it("disables next on the last page", () => {
    render(<NotificationPagination currentPage={3} lastPage={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "ถัดไป" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ก่อนหน้า" })).toBeEnabled();
  });
});
