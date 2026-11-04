import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TenderProjectFilterBar } from "@/app/dashboard/tender-projects/_components/filters/tender-project-filter-bar";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";

const PLACEHOLDER = "ค้นหาชื่อโครงการ | รหัสโครงการ";
const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];

type Props = React.ComponentProps<typeof TenderProjectFilterBar>;

function setup(props: Partial<Props> = {}) {
  const handlers = {
    setSearch: vi.fn(),
    setStatus: vi.fn(),
    setDepartmentId: vi.fn(),
    setFiscalYear: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
    setSort: vi.fn(),
    onSubmit: vi.fn(),
    onClear: vi.fn(),
  };
  render(
    <TenderProjectFilterBar
      departments={DEPARTMENTS}
      search=""
      status="all"
      departmentId={undefined}
      fiscalYear={undefined}
      dateFrom={undefined}
      dateTo={undefined}
      sort="latest"
      activeFilterCount={0}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, user: userEvent.setup() };
}

const labelOf = (c: HTMLElement) => (c.textContent ?? "").replace("▼", "");
const comboWithText = (text: string) => screen.getAllByRole("combobox").find((c) => labelOf(c) === text)!;

describe("TenderProjectFilterBar — search", () => {
  it("shows the current search text", () => {
    setup({ search: "คอมพิวเตอร์" });

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("คอมพิวเตอร์");
  });

  it("reports what is typed", () => {
    const { setSearch } = setup();

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "TP-2026" } });

    expect(setSearch).toHaveBeenCalledExactlyOnceWith("TP-2026");
  });

  it("clears the search with the inline clear button", async () => {
    const { user, setSearch } = setup({ search: "abc" });

    await user.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));

    expect(setSearch).toHaveBeenCalledExactlyOnceWith("");
  });
});

describe("TenderProjectFilterBar — submit and clear", () => {
  it("submits the filters from the search button without reloading the page", async () => {
    const { user, onSubmit } = setup();

    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("submits when enter is pressed in the search box", async () => {
    const { user, onSubmit } = setup();

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "{Enter}");

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("clears with the wide clear button", async () => {
    const { user, onClear, onSubmit } = setup();

    await user.click(screen.getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(onClear).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears with the compact clear button next to the sheet trigger", async () => {
    const { user, onClear } = setup();

    await user.click(screen.getByRole("button", { name: "ล้างการค้นหาและตัวกรอง" }));

    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe("TenderProjectFilterBar — filters", () => {
  it("shows the sheet trigger with the active filter count", () => {
    setup({ activeFilterCount: 2 });

    expect(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 2)" })).toBeInTheDocument();
  });

  it("shows the draft filter values in the wide filter row", () => {
    setup({ status: "closed", departmentId: 2, dateFrom: "2026-01-05", dateTo: "2026-06-30" });

    expect(comboWithText("ปิดรับซอง")).toBeInTheDocument();
    expect(comboWithText("บัญชี")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5 ม\.ค\. \d{4} ถึง 30 มิ\.ย\. \d{4}/ })).toBeInTheDocument();
  });

  it("forwards a status choice from the wide filter row", async () => {
    const { user, setStatus } = setup();

    await user.click(comboWithText("สถานะ"));
    await user.click(await screen.findByRole("option", { name: "เสร็จสิ้น" }));

    expect(setStatus).toHaveBeenCalledExactlyOnceWith("completed");
  });

  it("shows the sort select in the wide row and forwards a choice", async () => {
    const { user, setSort } = setup({ sort: "budget:asc" });
    const select = screen.getByRole("combobox", { name: "เรียงตาม" });
    expect(select).toHaveTextContent("งบประมาณ น้อย → มาก");

    await user.click(select);
    await user.click(await screen.findByRole("option", { name: "เพิ่มล่าสุด" }));

    expect(setSort).toHaveBeenCalledExactlyOnceWith("latest");
  });
});
