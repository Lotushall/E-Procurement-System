import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TenderProjectFilterFields } from "@/app/dashboard/tender-projects/_components/filters/tender-project-filter-fields";
import { FISCAL_YEAR_OPTIONS } from "@/lib/tender/fiscal-year-options";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { freezeTimeAt } from "@/tests/helpers/time";

const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const STATUS_LABELS = ["ทั้งหมด", "ร่าง", "กำลังดำเนินการ", "ปิดรับซอง", "เสร็จสิ้น", "ยกเลิก", "เก็บถาวร"];

type Props = React.ComponentProps<typeof TenderProjectFilterFields>;

function setup(props: Partial<Props> = {}) {
  const handlers = {
    setStatus: vi.fn(),
    setDepartmentId: vi.fn(),
    setFiscalYear: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
  };
  const view = render(
    <TenderProjectFilterFields
      departments={DEPARTMENTS}
      status="all"
      departmentId={undefined}
      fiscalYear={undefined}
      dateFrom={undefined}
      dateTo={undefined}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, user: userEvent.setup(), ...view };
}

const comboWithText = (text: string) =>
  screen.getAllByRole("combobox").find((c) => c.textContent?.replace("▼", "") === text)!;

freezeTimeAt("2026-11-02T10:00:00+07:00");

describe("TenderProjectFilterFields — status", () => {
  it("shows the placeholder while no status is chosen", () => {
    setup();

    expect(comboWithText("สถานะ")).toBeInTheDocument();
  });

  it.each([
    ["draft", "ร่าง"],
    ["published", "กำลังดำเนินการ"],
    ["closed", "ปิดรับซอง"],
    ["completed", "เสร็จสิ้น"],
    ["cancelled", "ยกเลิก"],
    ["archived", "เก็บถาวร"],
  ] as const)("shows %s as %s", (status, label) => {
    setup({ status });

    expect(comboWithText(label)).toBeInTheDocument();
  });

  it("offers all statuses and reports the chosen one", async () => {
    const { user, setStatus } = setup();

    await user.click(comboWithText("สถานะ"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(STATUS_LABELS);
    await user.click(screen.getByRole("option", { name: "ปิดรับซอง" }));
    expect(setStatus).toHaveBeenCalledExactlyOnceWith("closed");
  });

  it("reports all when the all option is chosen", async () => {
    const { user, setStatus } = setup({ status: "draft" });

    await user.click(comboWithText("ร่าง"));
    await user.click(await screen.findByRole("option", { name: "ทั้งหมด" }));

    expect(setStatus).toHaveBeenCalledExactlyOnceWith("all");
  });
});

describe("TenderProjectFilterFields — department", () => {
  it("shows the placeholder while no department is chosen", () => {
    setup();

    expect(comboWithText("แผนก")).toBeInTheDocument();
  });

  it("shows the chosen department's name", () => {
    setup({ departmentId: 2 });

    expect(comboWithText("บัญชี")).toBeInTheDocument();
  });

  it("offers the all option and every department and reports the chosen id as a number", async () => {
    const { user, setDepartmentId } = setup();

    await user.click(comboWithText("แผนก"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกหน่วยงาน", "จัดซื้อ", "บัญชี"]);
    await user.click(screen.getByRole("option", { name: "บัญชี" }));
    expect(setDepartmentId).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("reports undefined when all departments is chosen", async () => {
    const { user, setDepartmentId } = setup({ departmentId: 2 });

    await user.click(comboWithText("บัญชี"));
    await user.click(await screen.findByRole("option", { name: "ทุกหน่วยงาน" }));

    expect(setDepartmentId).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("searches inside the field itself when rendered in a sheet", () => {
    setup({ inSheet: true });

    expect(screen.getByPlaceholderText("แผนก")).toBeInTheDocument();
  });
});

describe("TenderProjectFilterFields — fiscal year", () => {
  it("shows the placeholder while no year is chosen", () => {
    setup();

    expect(comboWithText("ปีงบประมาณ")).toBeInTheDocument();
  });

  it("shows the chosen year's label", () => {
    const year = FISCAL_YEAR_OPTIONS[2];

    setup({ fiscalYear: year.value });

    expect(comboWithText(year.label)).toBeInTheDocument();
  });

  it("offers the all option and the five most recent years, and reports the chosen year", async () => {
    const { user, setFiscalYear } = setup();

    await user.click(comboWithText("ปีงบประมาณ"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(FISCAL_YEAR_OPTIONS.map((o) => o.label));
    expect(options).toHaveLength(6);
    await user.click(screen.getByRole("option", { name: FISCAL_YEAR_OPTIONS[1].label }));
    expect(setFiscalYear).toHaveBeenCalledExactlyOnceWith(FISCAL_YEAR_OPTIONS[1].value);
  });

  it("reports undefined when the all option is chosen", async () => {
    const { user, setFiscalYear } = setup({ fiscalYear: FISCAL_YEAR_OPTIONS[1].value });

    await user.click(comboWithText(FISCAL_YEAR_OPTIONS[1].label));
    await user.click(await screen.findByRole("option", { name: "ทุกปีงบประมาณ" }));

    expect(setFiscalYear).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});

describe("TenderProjectFilterFields — project period", () => {
  it("shows the placeholder when no dates are chosen", () => {
    setup();

    expect(screen.getByRole("button", { name: "ระยะเวลาโครงการ" })).toBeInTheDocument();
  });

  it("shows both dates when a range is chosen", () => {
    setup({ dateFrom: "2026-01-05", dateTo: "2026-06-30" });

    expect(screen.getByRole("button", { name: /5 ม\.ค\. \d{4} ถึง 30 มิ\.ย\. \d{4}/ })).toBeInTheDocument();
  });

  it("shows an ellipsis for the missing end", () => {
    setup({ dateFrom: "2026-01-05" });

    expect(screen.getByRole("button", { name: /5 ม\.ค\. \d{4} ถึง \.\.\./ })).toBeInTheDocument();
  });

  it("shows an ellipsis for the missing start", () => {
    setup({ dateTo: "2026-06-30" });

    expect(screen.getByRole("button", { name: /^\.\.\. ถึง 30 มิ\.ย\. \d{4}$/ })).toBeInTheDocument();
  });

  it("clears both dates with the clear button", async () => {
    const { user, setDateFrom, setDateTo } = setup({ dateFrom: "2026-01-05", dateTo: "2026-06-30" });

    await user.click(screen.getByRole("button", { name: /ถึง/ }));
    await user.click(await screen.findByRole("button", { name: "ล้างค่า" }));

    expect(setDateFrom).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(setDateTo).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("reports the first picked day as the start of the range", async () => {
    const { user, setDateFrom, setDateTo } = setup();

    await user.click(screen.getByRole("button", { name: "ระยะเวลาโครงการ" }));
    await user.click(await screen.findByRole("button", { name: "วันอาทิตย์ที่ 15 พฤศจิกายน 2026" }));

    expect(setDateFrom).toHaveBeenLastCalledWith("2026-11-15");
    expect(setDateTo).toHaveBeenLastCalledWith("2026-11-15");
  });

  it("extends an existing start into a range when a later day is picked", async () => {
    const { user, setDateFrom, setDateTo } = setup({ dateFrom: "2026-11-10" });

    await user.click(screen.getByRole("button", { name: /ถึง/ }));
    await user.click(await screen.findByRole("button", { name: "วันศุกร์ที่ 20 พฤศจิกายน 2026" }));

    expect(setDateFrom).toHaveBeenLastCalledWith("2026-11-10");
    expect(setDateTo).toHaveBeenLastCalledWith("2026-11-20");
  });
});
