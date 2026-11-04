import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InternalProfileFilterBar } from "@/app/dashboard/internal-employees/_components/filters/internal-profile-filter-bar";
import { makeDepartment, makePosition } from "@/tests/fixtures/internal-profiles";

const PLACEHOLDER = "ค้นหารหัสพนักงาน | ชื่อ | นามสกุล | เบอร์โทร";
const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const POSITIONS = [makePosition({ id: 5, name: "ผู้จัดการ" }), makePosition({ id: 6, name: "เจ้าหน้าที่" })];

type Props = React.ComponentProps<typeof InternalProfileFilterBar>;

function setup(props: Partial<Props> = {}) {
  const handlers = {
    setSearch: vi.fn(),
    setDepartmentFilter: vi.fn(),
    setPositionFilter: vi.fn(),
    setSorting: vi.fn(),
    onClear: vi.fn(),
  };
  const view = render(
    <InternalProfileFilterBar
      departments={DEPARTMENTS}
      positions={POSITIONS}
      search=""
      departmentFilter="all"
      positionFilter="all"
      sorting={[]}
      activeFilterCount={0}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, user: userEvent.setup(), ...view };
}

// combobox ที่แสดงข้อความนี้ (ปุ่มเลือกแผนก/ตำแหน่ง หรือ select เรียงตาม)
const comboWithText = (text: string | RegExp) =>
  screen.getAllByRole("combobox").find((c) => (typeof text === "string" ? c.textContent === text : text.test(c.textContent ?? "")))!;

describe("InternalProfileFilterBar — search", () => {
  it("shows the current search text", () => {
    setup({ search: "สมชาย" });

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("สมชาย");
  });

  it("reports what is typed", () => {
    const { setSearch } = setup();

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "บัญชี" } });

    expect(setSearch).toHaveBeenCalledExactlyOnceWith("บัญชี");
  });

  it("clears the search with the inline clear button", async () => {
    const { user, setSearch } = setup({ search: "abc" });

    await user.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));

    expect(setSearch).toHaveBeenCalledExactlyOnceWith("");
  });
});

describe("InternalProfileFilterBar — department and position filters", () => {
  it("shows the placeholders while nothing is filtered", () => {
    setup();

    expect(comboWithText("แผนก")).toBeInTheDocument();
    expect(comboWithText("ตำแหน่ง")).toBeInTheDocument();
  });

  it("shows the names of the active filters", () => {
    setup({ departmentFilter: "2", positionFilter: "6", activeFilterCount: 2 });

    expect(comboWithText("บัญชี")).toBeInTheDocument();
    expect(comboWithText("เจ้าหน้าที่")).toBeInTheDocument();
  });

  it("offers all departments plus the all option and reports the chosen id", async () => {
    const { user, setDepartmentFilter } = setup();

    await user.click(comboWithText("แผนก"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกแผนก", "จัดซื้อ", "บัญชี"]);
    await user.click(screen.getByRole("option", { name: "บัญชี" }));
    expect(setDepartmentFilter).toHaveBeenCalledExactlyOnceWith("2");
  });

  it("reports all when the all-departments option is chosen", async () => {
    const { user, setDepartmentFilter } = setup({ departmentFilter: "2", activeFilterCount: 1 });

    await user.click(comboWithText("บัญชี"));
    await user.click(await screen.findByRole("option", { name: "ทุกแผนก" }));

    expect(setDepartmentFilter).toHaveBeenCalledExactlyOnceWith("all");
  });

  it("offers all positions plus the all option and reports the chosen id", async () => {
    const { user, setPositionFilter } = setup();

    await user.click(comboWithText("ตำแหน่ง"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกตำแหน่ง", "ผู้จัดการ", "เจ้าหน้าที่"]);
    await user.click(screen.getByRole("option", { name: "ผู้จัดการ" }));
    expect(setPositionFilter).toHaveBeenCalledExactlyOnceWith("5");
  });

  it("reports all when the all-positions option is chosen", async () => {
    const { user, setPositionFilter } = setup({ positionFilter: "6", activeFilterCount: 1 });

    await user.click(comboWithText("เจ้าหน้าที่"));
    await user.click(await screen.findByRole("option", { name: "ทุกตำแหน่ง" }));

    expect(setPositionFilter).toHaveBeenCalledExactlyOnceWith("all");
  });
});

describe("InternalProfileFilterBar — sorting", () => {
  it("shows the default sort label when nothing is sorted", () => {
    setup();

    expect(screen.getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("ค่าเริ่มต้น");
  });

  it("shows the label of the active sort", () => {
    setup({ sorting: [{ id: "department", desc: true }] });

    expect(screen.getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("แผนก ฮ → ก");
  });

  it("offers every column and direction the table headers can set", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "ค่าเริ่มต้น",
      "รหัสพนักงาน น้อย → มาก",
      "รหัสพนักงาน มาก → น้อย",
      "ชื่อ ก → ฮ",
      "ชื่อ ฮ → ก",
      "นามสกุล ก → ฮ",
      "นามสกุล ฮ → ก",
      "แผนก ก → ฮ",
      "แผนก ฮ → ก",
      "ตำแหน่ง ก → ฮ",
      "ตำแหน่ง ฮ → ก",
    ]);
  });

  it("reports the chosen column and direction", async () => {
    const { user, setSorting } = setup();

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "นามสกุล ฮ → ก" }));

    expect(setSorting).toHaveBeenCalledExactlyOnceWith([{ id: "lastname", desc: true }]);
  });

  it("reports an empty sort for the default option", async () => {
    const { user, setSorting } = setup({ sorting: [{ id: "firstname", desc: false }] });

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "ค่าเริ่มต้น" }));

    expect(setSorting).toHaveBeenCalledExactlyOnceWith([]);
  });
});

describe("InternalProfileFilterBar — small-screen filter sheet", () => {
  it("labels the sheet button with the number of active filters", () => {
    setup({ activeFilterCount: 2 });

    expect(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 2)" })).toBeInTheDocument();
  });

  it("labels the sheet button plainly when no filter is active", () => {
    setup();

    expect(screen.getByRole("button", { name: "ตัวกรอง" })).toBeInTheDocument();
  });

  it("clears the search and filters from the clear button next to it", async () => {
    const { user, onClear } = setup({ activeFilterCount: 1 });

    await user.click(screen.getByRole("button", { name: "ล้างการค้นหาและตัวกรอง" }));

    expect(onClear).toHaveBeenCalledOnce();
  });

  it("opens a sheet with the filters and the sort order", async () => {
    const { user } = setup({ sorting: [{ id: "position", desc: false }] });

    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "ตัวกรอง" })).toBeInTheDocument();
    expect(within(sheet).getByRole("heading", { name: "เรียงตาม" })).toBeInTheDocument();
    expect(within(sheet).getByPlaceholderText("แผนก")).toBeInTheDocument();
    expect(within(sheet).getByPlaceholderText("ตำแหน่ง")).toBeInTheDocument();
    expect(within(sheet).getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("ตำแหน่ง ก → ฮ");
  });

  it("filters by department typed into the sheet field", async () => {
    const { user, setDepartmentFilter } = setup();
    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));
    const sheet = await screen.findByRole("dialog");

    await user.type(within(sheet).getByPlaceholderText("แผนก"), "จัด");
    await user.click(await screen.findByRole("option", { name: "จัดซื้อ" }));

    expect(setDepartmentFilter).toHaveBeenCalledExactlyOnceWith("1");
  });

  it("filters by position typed into the sheet field", async () => {
    const { user, setPositionFilter } = setup();
    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));
    const sheet = await screen.findByRole("dialog");

    await user.type(within(sheet).getByPlaceholderText("ตำแหน่ง"), "เจ้า");
    await user.click(await screen.findByRole("option", { name: "เจ้าหน้าที่" }));

    expect(setPositionFilter).toHaveBeenCalledExactlyOnceWith("6");
  });

  it("clears everything from the sheet and closes it", async () => {
    const { user, onClear } = setup({ activeFilterCount: 1 });
    await user.click(screen.getByRole("button", { name: /^ตัวกรอง/ }));
    const sheet = await screen.findByRole("dialog");

    await user.click(within(sheet).getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(onClear).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the sheet with the done button without clearing", async () => {
    const { user, onClear } = setup();
    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));
    const sheet = await screen.findByRole("dialog");

    await user.click(within(sheet).getByRole("button", { name: "เสร็จ" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onClear).not.toHaveBeenCalled();
  });
});
