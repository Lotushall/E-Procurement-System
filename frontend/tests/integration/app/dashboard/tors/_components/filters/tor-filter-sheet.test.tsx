import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TorFilterSheet } from "@/app/dashboard/tors/_components/filters/tor-filter-sheet";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { makeTenderProjectOption } from "@/tests/fixtures/tender-projects";

const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const PROJECTS = [makeTenderProjectOption({ id: 7, projectCode: "TP-2026-007", name: "จัดซื้อคอมพิวเตอร์" })];

type Props = React.ComponentProps<typeof TorFilterSheet>;

function setup(props: Partial<Props> = {}) {
  const handlers = {
    setStatus: vi.fn(),
    setDepartmentId: vi.fn(),
    setFiscalYear: vi.fn(),
    setProcurementMethod: vi.fn(),
    setTenderProjectId: vi.fn(),
    setSort: vi.fn(),
    onApply: vi.fn(),
    onClear: vi.fn(),
  };
  render(
    <TorFilterSheet
      departments={DEPARTMENTS}
      tenderProjects={PROJECTS}
      status="all"
      departmentId={undefined}
      fiscalYear={undefined}
      procurementMethod={undefined}
      tenderProjectId={undefined}
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

describe("TorFilterSheet", () => {
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

  it("opens with the filter and sort sections showing the draft values", async () => {
    const { user } = setup({ status: "bidding", sort: "budget_estimate:desc" });

    const dialog = await openSheet(user);

    expect(within(dialog).getByRole("heading", { name: "ตัวกรองและการเรียงลำดับ" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "ตัวกรอง" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "เรียงตาม" })).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "เรียงตาม" })).toHaveTextContent("ราคากลาง มาก → น้อย");
    expect(within(dialog).getByText("เปิดรับซอง")).toBeInTheDocument();
  });

  it("searches departments and projects inside the field rather than in a popup", async () => {
    const { user } = setup();

    const dialog = await openSheet(user);

    expect(within(dialog).getByPlaceholderText("หน่วยงาน")).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText("โครงการ")).toBeInTheDocument();
  });

  it("forwards a sort choice", async () => {
    const { user, setSort } = setup();
    const dialog = await openSheet(user);

    await user.click(within(dialog).getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "ชื่อ TOR ก → ฮ" }));

    expect(setSort).toHaveBeenCalledExactlyOnceWith("title:asc");
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

  it("forwards a procurement method choice", async () => {
    const { user, setProcurementMethod } = setup();
    const dialog = await openSheet(user);

    await user.click(
      within(dialog)
        .getAllByRole("combobox")
        .find((c) => (c.textContent ?? "").replace("▼", "") === "วิธีจัดซื้อจัดจ้าง")!,
    );
    await user.click(await screen.findByRole("option", { name: "คัดเลือก" }));

    expect(setProcurementMethod).toHaveBeenCalledExactlyOnceWith("คัดเลือก");
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
