import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ListClearButton, ListFilterSheet, ListFilterSheetSection } from "@/components/list-filter-sheet";

describe("ListFilterSheet", () => {
  it("labels the trigger without a count when no filter is active", () => {
    render(
      <ListFilterSheet activeCount={0} onClear={vi.fn()}>
        <p>เนื้อหา</p>
      </ListFilterSheet>,
    );

    const trigger = screen.getByRole("button", { name: "ตัวกรอง" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toHaveTextContent(/\d/);
  });

  it("shows the active filter count in the badge and label", () => {
    render(
      <ListFilterSheet activeCount={3} onClear={vi.fn()}>
        <p>เนื้อหา</p>
      </ListFilterSheet>,
    );

    const trigger = screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 3)" });
    expect(trigger).toHaveTextContent("3");
  });

  it("opens the sheet with the default title and children", async () => {
    const user = userEvent.setup();
    render(
      <ListFilterSheet activeCount={0} onClear={vi.fn()}>
        <p>ช่องกรอง</p>
      </ListFilterSheet>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("ตัวกรองและการเรียงลำดับ");
    expect(dialog).toHaveTextContent("ช่องกรอง");
  });

  it("uses a custom title", async () => {
    const user = userEvent.setup();
    render(
      <ListFilterSheet activeCount={0} onClear={vi.fn()} title="กรอง TOR">
        <p>x</p>
      </ListFilterSheet>,
    );

    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("กรอง TOR");
  });

  it("shows only a done button when there is no onApply, and closes on it", async () => {
    const user = userEvent.setup();
    render(
      <ListFilterSheet activeCount={0} onClear={vi.fn()}>
        <p>x</p>
      </ListFilterSheet>,
    );

    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));
    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: "แสดงผล" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "เสร็จ" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onApply and closes when the apply button is pressed", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <ListFilterSheet activeCount={1} onClear={vi.fn()} onApply={onApply}>
        <p>x</p>
      </ListFilterSheet>,
    );

    await user.click(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 1)" }));
    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: "เสร็จ" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "แสดงผล" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClear and closes when the clear button is pressed", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onApply = vi.fn();
    render(
      <ListFilterSheet activeCount={2} onClear={onClear} onApply={onApply}>
        <p>x</p>
      </ListFilterSheet>,
    );

    await user.click(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 2)" }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ListFilterSheetSection", () => {
  it("renders the title as a heading with its children", () => {
    render(
      <ListFilterSheetSection title="เรียงตาม">
        <p>ตัวเลือก</p>
      </ListFilterSheetSection>,
    );

    expect(screen.getByRole("heading", { level: 3, name: "เรียงตาม" })).toBeInTheDocument();
    expect(screen.getByText("ตัวเลือก")).toBeInTheDocument();
  });
});

describe("ListClearButton", () => {
  it("calls onClear when clicked", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<ListClearButton onClear={onClear} />);

    await user.click(screen.getByRole("button", { name: "ล้างการค้นหาและตัวกรอง" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
