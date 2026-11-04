import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SortingState } from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import { VendorFilterBar } from "@/app/dashboard/vendors/_components/filters/vendor-filter-bar";
import type { VendorListFilter } from "@/lib/vendor/approval/types";

const PLACEHOLDER = "ค้นหาชื่อผู้ค้า | ชื่อร้านค้า | หมวดสินค้า/บริการ | เบอร์โทรศัพท์/อีเมล";

function renderBar(
  props: Partial<{
    search: string;
    filter: VendorListFilter;
    sorting: SortingState;
    activeFilterCount: number;
  }> = {},
) {
  const handlers = {
    setSearch: vi.fn(),
    setFilter: vi.fn(),
    setSorting: vi.fn(),
    onClear: vi.fn(),
  };
  render(
    <VendorFilterBar
      search={props.search ?? ""}
      filter={props.filter ?? "all"}
      sorting={props.sorting ?? []}
      activeFilterCount={props.activeFilterCount ?? 0}
      {...handlers}
    />,
  );
  return { ...handlers, user: userEvent.setup() };
}

// ใน jsdom ไม่มี CSS breakpoint จึงเห็นทั้ง select ฝั่ง desktop (นอก sheet) — ตัวแรกคือสถานะ ตัวที่สองคือเรียงตาม
const statusSelect = () => screen.getAllByRole("combobox")[0];
const sortSelect = () => screen.getByRole("combobox", { name: "เรียงตาม" });

describe("VendorFilterBar — search", () => {
  it("shows the search value and placeholder", () => {
    renderBar({ search: "บริษัท" });

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("บริษัท");
  });

  it("reports typing through setSearch", async () => {
    const { user, setSearch } = renderBar();

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "ก");

    expect(setSearch).toHaveBeenCalledWith("ก");
  });

  it("clears the search with the clear-search button", async () => {
    const { user, setSearch } = renderBar({ search: "abc" });

    await user.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));

    expect(setSearch).toHaveBeenCalledWith("");
  });
});

describe("VendorFilterBar — status select", () => {
  it("shows the label of the current filter", () => {
    renderBar({ filter: "approved" });

    expect(statusSelect()).toHaveTextContent("อนุมัติแล้ว");
  });

  it("lists every status and reports the chosen one", async () => {
    const { user, setFilter } = renderBar();

    await user.click(statusSelect());
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "ทุกสถานะ",
      "รอตรวจสอบ",
      "อนุมัติแล้ว",
      "ถูกปฏิเสธ",
    ]);
    await user.click(within(listbox).getByRole("option", { name: "ถูกปฏิเสธ" }));

    expect(setFilter).toHaveBeenCalledWith("rejected");
  });
});

describe("VendorFilterBar — sort select", () => {
  it("shows the default option when not sorted", () => {
    renderBar();

    expect(sortSelect()).toHaveTextContent("ค่าเริ่มต้น");
  });

  it.each([
    [[{ id: "created_at", desc: true }], "วันที่สมัคร ใหม่ → เก่า"],
    [[{ id: "created_at", desc: false }], "วันที่สมัคร เก่า → ใหม่"],
    [[{ id: "name", desc: false }], "ชื่อผู้ค้า ก → ฮ"],
    [[{ id: "business_type", desc: true }], "หมวดสินค้า/บริการ ฮ → ก"],
  ])("shows the option matching sorting %j", (sorting, label) => {
    renderBar({ sorting });

    expect(sortSelect()).toHaveTextContent(label);
  });

  it("reports the chosen column and direction", async () => {
    const { user, setSorting } = renderBar();

    await user.click(sortSelect());
    await user.click(await screen.findByRole("option", { name: "ประเภท ฮ → ก" }));

    expect(setSorting).toHaveBeenCalledWith([{ id: "user_type", desc: true }]);
  });

  it("resets the sorting when the default option is chosen", async () => {
    const { user, setSorting } = renderBar({ sorting: [{ id: "name", desc: false }] });

    await user.click(sortSelect());
    await user.click(await screen.findByRole("option", { name: "ค่าเริ่มต้น" }));

    expect(setSorting).toHaveBeenCalledWith([]);
  });
});

describe("VendorFilterBar — small screens", () => {
  it("clears search and filters from the clear button next to the filter button", async () => {
    const { user, onClear } = renderBar();

    await user.click(screen.getByRole("button", { name: "ล้างการค้นหาและตัวกรอง" }));

    expect(onClear).toHaveBeenCalledOnce();
  });

  it("labels the filter button without a count when no filter is active", () => {
    renderBar();

    expect(screen.getByRole("button", { name: "ตัวกรอง" })).toBeInTheDocument();
  });

  it("shows the active filter count on the filter button", () => {
    renderBar({ filter: "pending", activeFilterCount: 1 });

    expect(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 1)" })).toHaveTextContent("1");
  });

  it("opens a sheet with the status filter and sort sections, and closes it with เสร็จ", async () => {
    const { user } = renderBar({ filter: "pending", activeFilterCount: 1 });

    await user.click(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 1)" }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "ตัวกรอง" })).toBeInTheDocument();
    expect(within(sheet).getByRole("heading", { name: "เรียงตาม" })).toBeInTheDocument();
    expect(within(sheet).getAllByRole("combobox")[0]).toHaveTextContent("รอตรวจสอบ");

    await user.click(within(sheet).getByRole("button", { name: "เสร็จ" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("changes the filter from inside the sheet", async () => {
    const { user, setFilter } = renderBar();

    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getAllByRole("combobox")[0]);
    await user.click(await screen.findByRole("option", { name: "อนุมัติแล้ว" }));

    expect(setFilter).toHaveBeenCalledWith("approved");
  });

  it("clears and closes from ล้างตัวกรอง inside the sheet", async () => {
    const { user, onClear } = renderBar({ filter: "rejected", activeFilterCount: 1 });

    await user.click(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 1)" }));
    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(onClear).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
