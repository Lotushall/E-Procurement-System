import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserFilterBar } from "@/app/dashboard/users/_components/filters/user-filter-bar";

const PLACEHOLDER = "ค้นหาชื่อ | username | อีเมล";

type Props = React.ComponentProps<typeof UserFilterBar>;

function setup(props: Partial<Props> = {}) {
  const handlers = {
    setSearch: vi.fn(),
    setTypeFilter: vi.fn(),
    setStatusFilter: vi.fn(),
    setSorting: vi.fn(),
    onClear: vi.fn(),
  };
  const view = render(
    <UserFilterBar
      search=""
      typeFilter="all"
      statusFilter="all"
      sorting={[]}
      activeFilterCount={0}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, user: userEvent.setup(), ...view };
}

// ปุ่ม Select มีสัญลักษณ์ ▼ ต่อท้ายข้อความ
const labelOf = (c: HTMLElement) => (c.textContent ?? "").replace("▼", "");
const comboWithText = (text: string) => screen.getAllByRole("combobox").find((c) => labelOf(c) === text)!;

describe("UserFilterBar — search", () => {
  it("shows the current search text", () => {
    setup({ search: "สมชาย" });

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("สมชาย");
  });

  it("reports what is typed", () => {
    const { setSearch } = setup();

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "abc" } });

    expect(setSearch).toHaveBeenCalledExactlyOnceWith("abc");
  });

  it("clears the search with the inline clear button", async () => {
    const { user, setSearch } = setup({ search: "abc" });

    await user.click(screen.getByRole("button", { name: "ล้างคำค้นหา" }));

    expect(setSearch).toHaveBeenCalledExactlyOnceWith("");
  });
});

describe("UserFilterBar — type filter", () => {
  it("shows the label of the active type", () => {
    setup({ typeFilter: "company", activeFilterCount: 1 });

    expect(comboWithText("นิติบุคคล")).toBeInTheDocument();
  });

  it("offers all types and reports the chosen one", async () => {
    const { user, setTypeFilter } = setup();

    await user.click(comboWithText("ทุกประเภท"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกประเภท", "พนักงานภายใน", "นิติบุคคล", "ร้านค้า"]);
    await user.click(screen.getByRole("option", { name: "ร้านค้า" }));
    expect(setTypeFilter).toHaveBeenCalledExactlyOnceWith("individual");
  });

  it("reports all when the all option is chosen", async () => {
    const { user, setTypeFilter } = setup({ typeFilter: "internal", activeFilterCount: 1 });

    await user.click(comboWithText("พนักงานภายใน"));
    await user.click(await screen.findByRole("option", { name: "ทุกประเภท" }));

    expect(setTypeFilter).toHaveBeenCalledExactlyOnceWith("all");
  });
});

describe("UserFilterBar — status filter", () => {
  it("shows the label of the active status", () => {
    setup({ statusFilter: "suspended", activeFilterCount: 1 });

    expect(comboWithText("ระงับการใช้งาน")).toBeInTheDocument();
  });

  it("offers all statuses and reports the chosen one", async () => {
    const { user, setStatusFilter } = setup();

    await user.click(comboWithText("ทุกสถานะ"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "ทุกสถานะ",
      "รอตรวจสอบ",
      "ใช้งานอยู่",
      "ระงับการใช้งาน",
      "ปิดใช้งาน",
    ]);
    await user.click(screen.getByRole("option", { name: "รอตรวจสอบ" }));
    expect(setStatusFilter).toHaveBeenCalledExactlyOnceWith("pending");
  });

  it("reports all when the all option is chosen", async () => {
    const { user, setStatusFilter } = setup({ statusFilter: "active", activeFilterCount: 1 });

    await user.click(comboWithText("ใช้งานอยู่"));
    await user.click(await screen.findByRole("option", { name: "ทุกสถานะ" }));

    expect(setStatusFilter).toHaveBeenCalledExactlyOnceWith("all");
  });
});

describe("UserFilterBar — sorting", () => {
  it("shows the default sort label when nothing is sorted", () => {
    setup();

    expect(screen.getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("ค่าเริ่มต้น");
  });

  it("shows the label of the active sort", () => {
    setup({ sorting: [{ id: "email", desc: true }] });

    expect(screen.getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("อีเมล Z → A");
  });

  it("offers every column and direction the table headers can set", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "ค่าเริ่มต้น",
      "วันที่สร้าง ใหม่ → เก่า",
      "วันที่สร้าง เก่า → ใหม่",
      "ชื่อผู้ใช้ A → Z",
      "ชื่อผู้ใช้ Z → A",
      "อีเมล A → Z",
      "อีเมล Z → A",
    ]);
  });

  it.each([
    ["วันที่สร้าง ใหม่ → เก่า", { id: "created_at", desc: true }],
    ["วันที่สร้าง เก่า → ใหม่", { id: "created_at", desc: false }],
    ["ชื่อผู้ใช้ Z → A", { id: "username", desc: true }],
    ["อีเมล A → Z", { id: "email", desc: false }],
  ])("reports %s as the chosen sort", async (label, expected) => {
    const { user, setSorting } = setup();

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: label }));

    expect(setSorting).toHaveBeenCalledExactlyOnceWith([expected]);
  });

  it("reports an empty sort for the default option", async () => {
    const { user, setSorting } = setup({ sorting: [{ id: "username", desc: false }] });

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "ค่าเริ่มต้น" }));

    expect(setSorting).toHaveBeenCalledExactlyOnceWith([]);
  });
});

describe("UserFilterBar — small-screen filter sheet", () => {
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

  it("opens a sheet with the type and status filters and the sort order", async () => {
    const { user } = setup({ typeFilter: "company", statusFilter: "pending", sorting: [{ id: "username", desc: false }], activeFilterCount: 2 });

    await user.click(screen.getByRole("button", { name: /^ตัวกรอง/ }));

    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "ตัวกรอง" })).toBeInTheDocument();
    expect(within(sheet).getByRole("heading", { name: "เรียงตาม" })).toBeInTheDocument();
    const labels = within(sheet).getAllByRole("combobox").map(labelOf);
    expect(labels).toEqual(expect.arrayContaining(["นิติบุคคล", "รอตรวจสอบ"]));
    expect(within(sheet).getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("ชื่อผู้ใช้ A → Z");
  });

  it("changes the type from inside the sheet", async () => {
    const { user, setTypeFilter } = setup();
    await user.click(screen.getByRole("button", { name: "ตัวกรอง" }));
    const sheet = await screen.findByRole("dialog");

    await user.click(within(sheet).getAllByRole("combobox").find((c) => labelOf(c) === "ทุกประเภท")!);
    await user.click(await screen.findByRole("option", { name: "พนักงานภายใน" }));

    expect(setTypeFilter).toHaveBeenCalledExactlyOnceWith("internal");
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
