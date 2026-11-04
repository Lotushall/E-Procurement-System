import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DashboardBreadcrumb } from "@/app/dashboard/_components/dashboard-breadcrumb";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";

function setBreadcrumb(items: Parameters<ReturnType<typeof useBreadcrumbStore.getState>["setItems"]>[0]) {
  act(() => useBreadcrumbStore.getState().setItems(items));
}

beforeEach(() => {
  useBreadcrumbStore.setState({ items: [] });
});

describe("DashboardBreadcrumb", () => {
  it("renders nothing while the store has no items", () => {
    const { container } = render(<DashboardBreadcrumb />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).not.toBeInTheDocument();
  });

  it("starts the trail with a link to the dashboard home, followed by the store items in order", () => {
    setBreadcrumb([
      { label: "โครงการจัดซื้อจัดจ้าง", href: "/dashboard/tender-projects" },
      { label: "รายละเอียด" },
    ]);
    render(<DashboardBreadcrumb />);

    const nav = screen.getByRole("navigation", { name: "breadcrumb" });
    const items = nav.querySelectorAll('[data-slot="breadcrumb-item"]');
    expect(Array.from(items, (item) => item.textContent)).toEqual([
      "แดชบอร์ด",
      "โครงการจัดซื้อจัดจ้าง",
      "รายละเอียด",
    ]);
    expect(screen.getByRole("link", { name: "แดชบอร์ด" })).toHaveAttribute("href", "/dashboard");
  });

  it("renders an item with an href as a link to that target", () => {
    setBreadcrumb([{ label: "การจัดการ TOR", href: "/dashboard/tors" }, { label: "TOR-2027-001" }]);
    render(<DashboardBreadcrumb />);

    expect(screen.getByRole("link", { name: "การจัดการ TOR" })).toHaveAttribute("href", "/dashboard/tors");
  });

  it("renders the item without an href as the current page, not as a navigable link", () => {
    setBreadcrumb([{ label: "การจัดการ TOR", href: "/dashboard/tors" }, { label: "TOR-2027-001" }]);
    render(<DashboardBreadcrumb />);

    const current = screen.getByText("TOR-2027-001");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("aria-disabled", "true");
    expect(current).not.toHaveAttribute("href");
  });

  it("separates the dashboard home and each item with a presentational separator", () => {
    setBreadcrumb([{ label: "A", href: "/a" }, { label: "B" }]);
    render(<DashboardBreadcrumb />);

    // 3 รายการ (แดชบอร์ด, A, B) → 2 ตัวคั่น ซึ่งซ่อนจาก screen reader (aria-hidden)
    const separators = document.querySelectorAll('[data-slot="breadcrumb-separator"]');
    expect(separators).toHaveLength(2);
    separators.forEach((separator) => expect(separator).toHaveAttribute("aria-hidden", "true"));
  });

  it("shows a skeleton in place of an item that is still loading, without its label", () => {
    setBreadcrumb([
      { label: "ผู้ใช้", href: "/dashboard/users" },
      { loading: true, label: "ไม่ควรแสดง", href: "/dashboard/users/detail" },
    ]);
    render(<DashboardBreadcrumb />);

    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(1);
    expect(screen.queryByText("ไม่ควรแสดง")).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="breadcrumb-item"]')).toHaveLength(3);
  });

  it("replaces the skeleton with the label once the store item finishes loading", () => {
    setBreadcrumb([{ label: "ผู้ใช้", href: "/dashboard/users" }, { loading: true }]);
    render(<DashboardBreadcrumb />);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();

    setBreadcrumb([{ label: "ผู้ใช้", href: "/dashboard/users" }, { label: "somchai" }]);

    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();
    expect(screen.getByText("somchai")).toHaveAttribute("aria-current", "page");
  });

  it("updates when the store changes and disappears again when it is cleared", () => {
    render(<DashboardBreadcrumb />);
    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).not.toBeInTheDocument();

    setBreadcrumb([{ label: "รายงาน" }]);
    expect(screen.getByText("รายงาน")).toBeInTheDocument();

    act(() => useBreadcrumbStore.getState().clear());
    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).not.toBeInTheDocument();
  });
});
