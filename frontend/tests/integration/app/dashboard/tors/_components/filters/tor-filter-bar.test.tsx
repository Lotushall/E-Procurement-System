import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TorFilterBar } from "@/app/dashboard/tors/_components/filters/tor-filter-bar";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { makeTenderProjectOption } from "@/tests/fixtures/tender-projects";

const PLACEHOLDER = "ค้นหาชื่อ TOR | รหัส TOR";
const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const PROJECTS = [makeTenderProjectOption({ id: 7, projectCode: "TP-2569-007", name: "จัดซื้อคอมพิวเตอร์" })];

type Props = React.ComponentProps<typeof TorFilterBar>;

function setup(props: Partial<Props> = {}) {
  const handlers = {
    setSearch: vi.fn(),
    setStatus: vi.fn(),
    setDepartmentId: vi.fn(),
    setFiscalYear: vi.fn(),
    setProcurementMethod: vi.fn(),
    setTenderProjectId: vi.fn(),
    setSort: vi.fn(),
    onSubmit: vi.fn(),
    onClear: vi.fn(),
  };
  render(
    <TorFilterBar
      departments={DEPARTMENTS}
      tenderProjects={PROJECTS}
      search=""
      status="all"
      departmentId={undefined}
      fiscalYear={undefined}
      procurementMethod={undefined}
      tenderProjectId={undefined}
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

describe("TorFilterBar — search", () => {
  it("shows the current search text", () => {
    setup({ search: "โน้ตบุ๊ก" });

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("โน้ตบุ๊ก");
  });

  it("reports what is typed", () => {
    const { setSearch } = setup();

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "TOR-2569" } });

    expect(setSearch).toHaveBeenCalledExactlyOnceWith("TOR-2569");
  });

  it("clears the search with the inline clear button", async () => {
    const { user, setSearch } = setup({ search: "abc" });

    await user.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));

    expect(setSearch).toHaveBeenCalledExactlyOnceWith("");
  });
});

describe("TorFilterBar — submit and clear", () => {
  it("submits the filters from the search button", async () => {
    const { user, onSubmit } = setup();

    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("submits when enter is pressed in the search box", async () => {
    const { user, onSubmit } = setup();

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "{Enter}");

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("clears with the wide clear button without submitting", async () => {
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

describe("TorFilterBar — filters", () => {
  it("shows the sheet trigger with the active filter count", () => {
    setup({ activeFilterCount: 2 });

    expect(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 2)" })).toBeInTheDocument();
  });

  it("shows the draft filter values in the wide filter row", () => {
    setup({
      status: "bidding",
      departmentId: 2,
      procurementMethod: "คัดเลือก",
      tenderProjectId: 7,
    });

    expect(comboWithText("เปิดรับซอง")).toBeInTheDocument();
    expect(comboWithText("บัญชี")).toBeInTheDocument();
    expect(comboWithText("คัดเลือก")).toBeInTheDocument();
    expect(comboWithText("TP-2569-007 · จัดซื้อคอมพิวเตอร์")).toBeInTheDocument();
  });

  it("forwards a status choice from the wide filter row", async () => {
    const { user, setStatus } = setup();

    await user.click(comboWithText("สถานะ"));
    await user.click(await screen.findByRole("option", { name: "ได้ผู้ชนะ" }));

    expect(setStatus).toHaveBeenCalledExactlyOnceWith("awarded");
  });

  it("forwards a tender project choice from the wide filter row", async () => {
    const { user, setTenderProjectId } = setup();

    await user.click(comboWithText("โครงการ"));
    await user.click(await screen.findByRole("option", { name: "ไม่สังกัดโครงการ" }));

    expect(setTenderProjectId).toHaveBeenCalledExactlyOnceWith("none");
  });

  it("shows the sort select in the wide row and forwards a choice", async () => {
    const { user, setSort } = setup({ sort: "budget_estimate:asc" });
    const select = screen.getByRole("combobox", { name: "เรียงตาม" });
    expect(select).toHaveTextContent("ราคากลาง น้อย → มาก");

    await user.click(select);
    await user.click(await screen.findByRole("option", { name: "เพิ่มล่าสุด" }));

    expect(setSort).toHaveBeenCalledExactlyOnceWith("latest");
  });
});
