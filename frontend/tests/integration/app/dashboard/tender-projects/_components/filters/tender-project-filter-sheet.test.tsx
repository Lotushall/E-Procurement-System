import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TenderProjectFilterSheet } from "@/app/dashboard/tender-projects/_components/filters/tender-project-filter-sheet";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";

const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];

type Props = React.ComponentProps<typeof TenderProjectFilterSheet>;

function setup(props: Partial<Props> = {}) {
  const handlers = {
    setStatus: vi.fn(),
    setDepartmentId: vi.fn(),
    setFiscalYear: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
    setSort: vi.fn(),
    onApply: vi.fn(),
    onClear: vi.fn(),
  };
  render(
    <TenderProjectFilterSheet
      departments={DEPARTMENTS}
      status="all"
      departmentId={undefined}
      fiscalYear={undefined}
      dateFrom={undefined}
      dateTo={undefined}
      sort="latest"
      activeCount={0}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, user: userEvent.setup() };
}

async function openSheet(user: ReturnType<typeof userEvent.setup>, name = "ตัวกรอง") {
  await user.click(screen.getByRole("button", { name }));
  return screen.findByRole("dialog");
}

describe("TenderProjectFilterSheet", () => {
  it("shows no count on the trigger when no filter is active", () => {
    setup();

    expect(screen.getByRole("button", { name: "ตัวกรอง" })).toBeInTheDocument();
  });

  it("shows the active count on the trigger", () => {
    setup({ activeCount: 3 });

    expect(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 3)" })).toBeInTheDocument();
  });

  it("keeps the sheet closed until the trigger is pressed", () => {
    setup();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens with the filter and sort sections", async () => {
    const { user } = setup({ status: "published", sort: "budget:desc" });

    const dialog = await openSheet(user);

    expect(within(dialog).getByRole("heading", { name: "ตัวกรองและการเรียงลำดับ" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "ตัวกรอง" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "เรียงตาม" })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("งบประมาณ มาก → น้อย");
    expect(within(dialog).getByText("กำลังดำเนินการ")).toBeInTheDocument();
  });

  it("searches departments inside the field rather than in a popup", async () => {
    const { user } = setup();

    const dialog = await openSheet(user);

    expect(within(dialog).getByPlaceholderText("แผนก")).toBeInTheDocument();
  });

  it("forwards a sort choice", async () => {
    const { user, setSort } = setup();
    const dialog = await openSheet(user);

    await user.click(within(dialog).getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "ชื่อโครงการ ก → ฮ" }));

    expect(setSort).toHaveBeenCalledExactlyOnceWith("name:asc");
  });

  it("forwards a status choice", async () => {
    const { user, setStatus } = setup();
    const dialog = await openSheet(user);

    await user.click(
      within(dialog)
        .getAllByRole("combobox")
        .find((c) => (c.textContent ?? "").replace("▼", "") === "สถานะ")!,
    );
    await user.click(await screen.findByRole("option", { name: "ยกเลิก" }));

    expect(setStatus).toHaveBeenCalledExactlyOnceWith("cancelled");
  });

  it("applies the draft filters and closes", async () => {
    const { user, onApply, onClear } = setup();
    const dialog = await openSheet(user);

    await user.click(within(dialog).getByRole("button", { name: "แสดงผล" }));

    expect(onApply).toHaveBeenCalledOnce();
    expect(onClear).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clears the filters and closes", async () => {
    const { user, onApply, onClear } = setup({ activeCount: 2 });
    const dialog = await openSheet(user, "ตัวกรอง (ใช้อยู่ 2)");

    await user.click(within(dialog).getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(onClear).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
