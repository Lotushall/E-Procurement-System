import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TorFilterFields } from "@/app/dashboard/tors/_components/filters/tor-filter-fields";
import { TOR_STATUS_STYLE, TOR_STATUSES } from "@/components/tor-status-badge";
import { FISCAL_YEAR_OPTIONS } from "@/lib/tender/fiscal-year-options";
import { PROCUREMENT_METHODS } from "@/lib/tender/procurement-methods";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { makeTenderProjectOption } from "@/tests/fixtures/tender-projects";

const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const PROJECTS = [
  makeTenderProjectOption({ id: 7, projectCode: "TP-2026-007", name: "จัดซื้อคอมพิวเตอร์" }),
  makeTenderProjectOption({ id: 8, projectCode: "TP-2026-008", name: "จัดซื้อโต๊ะทำงาน" }),
];
const PROJECT_8 = "TP-2026-008 · จัดซื้อโต๊ะทำงาน";
const STATUS_LABELS = ["ทั้งหมด", ...TOR_STATUSES.map((status) => TOR_STATUS_STYLE[status].label)];

type Props = React.ComponentProps<typeof TorFilterFields>;

function setup(props: Partial<Props> = {}) {
  const handlers = {
    setStatus: vi.fn(),
    setDepartmentId: vi.fn(),
    setFiscalYear: vi.fn(),
    setProcurementMethod: vi.fn(),
    setTenderProjectId: vi.fn(),
  };
  const view = render(
    <TorFilterFields
      departments={DEPARTMENTS}
      tenderProjects={PROJECTS}
      status="all"
      departmentId={undefined}
      fiscalYear={undefined}
      procurementMethod={undefined}
      tenderProjectId={undefined}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, user: userEvent.setup(), ...view };
}

const labelOf = (c: HTMLElement) => (c.textContent ?? "").replace("▼", "");
const comboWithText = (text: string) => screen.getAllByRole("combobox").find((c) => labelOf(c) === text)!;

describe("TorFilterFields — status", () => {
  it("shows the placeholder while no status is chosen", () => {
    setup();

    expect(comboWithText("สถานะ")).toBeInTheDocument();
  });

  it.each(TOR_STATUSES.map((status) => [status, TOR_STATUS_STYLE[status].label] as const))(
    "shows %s as %s",
    (status, label) => {
      setup({ status });

      expect(comboWithText(label)).toBeInTheDocument();
    },
  );

  it("offers all statuses in progress order and reports the chosen one", async () => {
    const { user, setStatus } = setup();

    await user.click(comboWithText("สถานะ"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(STATUS_LABELS);
    await user.click(screen.getByRole("option", { name: "อนุมัติแล้ว" }));
    expect(setStatus).toHaveBeenCalledExactlyOnceWith("approved");
  });

  it("reports all when the all option is chosen", async () => {
    const { user, setStatus } = setup({ status: "draft" });

    await user.click(comboWithText("ร่าง"));
    await user.click(await screen.findByRole("option", { name: "ทั้งหมด" }));

    expect(setStatus).toHaveBeenCalledExactlyOnceWith("all");
  });
});

describe("TorFilterFields — department", () => {
  it("shows the placeholder while no department is chosen", () => {
    setup();

    expect(comboWithText("หน่วยงาน")).toBeInTheDocument();
  });

  it("shows the chosen department's name", () => {
    setup({ departmentId: 2 });

    expect(comboWithText("บัญชี")).toBeInTheDocument();
  });

  it("offers the all option and every department and reports the chosen id as a number", async () => {
    const { user, setDepartmentId } = setup();

    await user.click(comboWithText("หน่วยงาน"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกหน่วยงาน", "จัดซื้อ", "บัญชี"]);
    await user.click(screen.getByRole("option", { name: "บัญชี" }));
    expect(setDepartmentId).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("offers only the all option when the departments could not be loaded", async () => {
    const { user } = setup({ departments: [] });

    await user.click(comboWithText("หน่วยงาน"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกหน่วยงาน"]);
  });

  it("reports undefined when all departments is chosen", async () => {
    const { user, setDepartmentId } = setup({ departmentId: 2 });

    await user.click(comboWithText("บัญชี"));
    await user.click(await screen.findByRole("option", { name: "ทุกหน่วยงาน" }));

    expect(setDepartmentId).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});

describe("TorFilterFields — fiscal year", () => {
  it("shows the placeholder while no year is chosen", () => {
    setup();

    expect(comboWithText("ปีงบประมาณ")).toBeInTheDocument();
  });

  it("shows the chosen year's label", () => {
    const year = FISCAL_YEAR_OPTIONS[2];

    setup({ fiscalYear: Number(year.value) });

    expect(comboWithText(year.label)).toBeInTheDocument();
  });

  it("offers the all option and the five most recent years, and reports the chosen year as a number", async () => {
    const { user, setFiscalYear } = setup();

    await user.click(comboWithText("ปีงบประมาณ"));

    const options = await screen.findAllByRole("option");
    // "ทุกปีงบประมาณ" + 5 ปี
    expect(options).toHaveLength(6);
    expect(options.map((o) => o.textContent)).toEqual(FISCAL_YEAR_OPTIONS.map((o) => o.label));
    await user.click(screen.getByRole("option", { name: FISCAL_YEAR_OPTIONS[1].label }));
    expect(setFiscalYear).toHaveBeenCalledExactlyOnceWith(Number(FISCAL_YEAR_OPTIONS[1].value));
  });

  it("reports undefined when the all option is chosen", async () => {
    const { user, setFiscalYear } = setup({ fiscalYear: Number(FISCAL_YEAR_OPTIONS[1].value) });

    await user.click(comboWithText(FISCAL_YEAR_OPTIONS[1].label));
    await user.click(await screen.findByRole("option", { name: "ทุกปีงบประมาณ" }));

    expect(setFiscalYear).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});

describe("TorFilterFields — procurement method", () => {
  it("shows the placeholder while no method is chosen", () => {
    setup();

    expect(comboWithText("วิธีจัดซื้อจัดจ้าง")).toBeInTheDocument();
  });

  it("shows the chosen method", () => {
    setup({ procurementMethod: "คัดเลือก" });

    expect(comboWithText("คัดเลือก")).toBeInTheDocument();
  });

  it("offers the all option and every procurement method and reports the chosen one", async () => {
    const { user, setProcurementMethod } = setup();

    await user.click(comboWithText("วิธีจัดซื้อจัดจ้าง"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกวิธีจัดซื้อจัดจ้าง", ...PROCUREMENT_METHODS]);
    await user.click(screen.getByRole("option", { name: "เฉพาะเจาะจง" }));
    expect(setProcurementMethod).toHaveBeenCalledExactlyOnceWith("เฉพาะเจาะจง");
  });

  it("reports undefined when the all option is chosen", async () => {
    const { user, setProcurementMethod } = setup({ procurementMethod: "คัดเลือก" });

    await user.click(comboWithText("คัดเลือก"));
    await user.click(await screen.findByRole("option", { name: "ทุกวิธีจัดซื้อจัดจ้าง" }));

    expect(setProcurementMethod).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});

describe("TorFilterFields — tender project", () => {
  it("shows the placeholder while no project is chosen", () => {
    setup();

    expect(comboWithText("โครงการ")).toBeInTheDocument();
  });

  it("shows the chosen project", () => {
    setup({ tenderProjectId: 8 });

    expect(comboWithText(PROJECT_8)).toBeInTheDocument();
  });

  it("shows the no-project choice", () => {
    setup({ tenderProjectId: "none" });

    expect(comboWithText("ไม่สังกัดโครงการ")).toBeInTheDocument();
  });

  it("reports the chosen project id", async () => {
    const { user, setTenderProjectId } = setup();

    await user.click(comboWithText("โครงการ"));
    await user.click(await screen.findByRole("option", { name: PROJECT_8 }));

    expect(setTenderProjectId).toHaveBeenCalledExactlyOnceWith(8);
  });

  it("reports none for the no-project choice", async () => {
    const { user, setTenderProjectId } = setup();

    await user.click(comboWithText("โครงการ"));
    await user.click(await screen.findByRole("option", { name: "ไม่สังกัดโครงการ" }));

    expect(setTenderProjectId).toHaveBeenCalledExactlyOnceWith("none");
  });
});

describe("TorFilterFields — rendered in a sheet", () => {
  it("searches departments and projects inside the field itself", () => {
    setup({ inSheet: true });

    expect(screen.getByPlaceholderText("หน่วยงาน")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("โครงการ")).toBeInTheDocument();
  });

  it("uses a popup search box for departments and projects outside a sheet", async () => {
    const { user } = setup();

    await user.click(comboWithText("หน่วยงาน"));
    expect(await screen.findByPlaceholderText("ค้นหาแผนก")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(comboWithText("โครงการ"));

    expect(await screen.findByPlaceholderText("ค้นหาโครงการ")).toBeInTheDocument();
  });
});
