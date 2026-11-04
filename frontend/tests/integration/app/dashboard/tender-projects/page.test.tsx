import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import TenderProjectsPage from "@/app/dashboard/tender-projects/page";
import type { CurrentUser } from "@/lib/auth/types";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { FISCAL_YEAR_OPTIONS } from "@/lib/tender/fiscal-year-options";
import type { TenderProjects } from "@/lib/tender/tender-projects/types";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { paginated } from "@/tests/fixtures/pagination";
import { makeTenderProject, makeTenderProjectStats } from "@/tests/fixtures/tender-projects";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/tender-projects");
const DEPARTMENTS_URL = apiUrl("/api/v1/dashboard/departments/select");
const PLACEHOLDER = "ค้นหาชื่อโครงการ | รหัสโครงการ";
const HEADING = "จัดการโครงการจัดซื้อจัดจ้าง";
const BASE = "/dashboard/tender-projects";
const ERROR_TEXT = "ไม่สามารถโหลดข้อมูลโครงการจัดซื้อจัดจ้างได้ กรุณาลองใหม่อีกครั้ง";
const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];

const COMPUTERS = makeTenderProject({
  id: 1,
  projectCode: "TP-2569-001",
  name: "จัดซื้อคอมพิวเตอร์",
  status: "draft",
  budget: "1000000.00",
  allocatedBudget: "250000.00",
  torsCount: 2,
});
const DESKS = makeTenderProject({
  id: 2,
  projectCode: "TP-2569-002",
  name: "จัดซื้อโต๊ะทำงาน",
  status: "published",
  department: { id: 2, name: "บัญชี" },
  budget: "500000.55",
  allocatedBudget: "0.00",
  torsCount: 0,
});

// วันนี้มีผลกับเดือนเริ่มต้นของปฏิทินช่วงวันที่ และข้อความเวลาที่เหลือบนการ์ด
freezeTimeAt("2026-11-02T10:00:00+07:00");

function serveList(projects: TenderProjects[], meta: Record<string, unknown> = {}) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get(LIST_URL, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(paginated(projects, { stats: makeTenderProjectStats(), ...meta }));
    }),
    http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: DEPARTMENTS })),
  );
  return queries;
}

// สิทธิ์ที่หน้านี้ต้องใช้ครบ (ตรงกับ policy ฝั่ง backend) — เคสที่ทดสอบการปฏิเสธส่ง permissions ที่จำกัดเองทุกครั้ง
const FULL_ACCESS = ["tender_projects.viewAny", "tender_projects.create", "tender_projects.update", "tender_projects.delete"];

// หน้านี้ครอบด้วย RequirePermission(tender_projects.viewAny) — ผู้ใช้ที่เรียกผ่านฟังก์ชันนี้มี viewAny เสมอ (บวกสิทธิ์ที่ส่งมา)
// เคสที่ทดสอบการปฏิเสธ viewAny ต้อง signInAs เอง
async function renderPage(url = BASE, auth: Partial<CurrentUser> = { id: 1000, permissions: FULL_ACCESS }) {
  setUrl(url);
  signInAs({ ...auth, permissions: ["tender_projects.viewAny", ...(auth.permissions ?? [])] });
  const rendered = renderWithQueryClient(<TenderProjectsPage />);
  // รอให้ gate ผ่าน (โหลด /auth/user เสร็จ) ก่อนเช็คเนื้อหาหน้า
  await screen.findByRole("heading", { name: HEADING });
  return { ...rendered, user: userEvent.setup() };
}

const labelOf = (c: HTMLElement) => (c.textContent ?? "").replace("▼", "");
const comboWithText = (text: string) => screen.getAllByRole("combobox").find((c) => labelOf(c) === text)!;

// รอให้ filter bar ขึ้น แล้วรอให้ list, แผนก และ /auth/user โหลดครบ
async function settled(queryClient: { isFetching: () => number }) {
  await screen.findByPlaceholderText(PLACEHOLDER);
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
}

// ตารางแรกที่เจอคือ skeleton ระหว่างโหลด จึงรอให้ชื่อโครงการแถวแรกขึ้นก่อนค่อยหยิบตารางจริง
async function loadedTable(name = COMPUTERS.name) {
  await screen.findAllByText(name);
  return screen.getByRole("table");
}

describe("TenderProjectsPage — shell and loading", () => {
  it("shows the heading, the description and the filter bar while the list is loading", async () => {
    server.use(http.get(LIST_URL, () => new Promise<never>(() => {})), http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: [] })));

    await renderPage();

    expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
    expect(screen.getByText("ภาพรวมโครงการทั้งหมดและ TOR ที่เกี่ยวข้อง")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
  });

  it("shows the table skeleton and blank stats while the list is loading", async () => {
    server.use(http.get(LIST_URL, () => new Promise<never>(() => {})), http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: [] })));

    const { container } = await renderPage();

    expect(within(screen.getByRole("table")).getAllByRole("columnheader")).toHaveLength(8);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="card"] [data-slot="skeleton"]')).toHaveLength(4);
  });

  it("sets the breadcrumb", async () => {
    serveList([COMPUTERS]);

    const { queryClient } = await renderPage();

    expect(useBreadcrumbStore.getState().items).toEqual([{ label: HEADING }]);
    await settled(queryClient);
  });

  it("opens the create dialog from the floating button", async () => {
    serveList([COMPUTERS]);
    // dialog โหลดรายชื่อผู้รับผิดชอบเมื่อเปิด
    server.use(http.get(apiUrl("/api/v1/dashboard/internal-profiles/select"), () => HttpResponse.json({ data: [] })));
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "สร้างโครงการใหม่" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("สร้างโครงการจัดซื้อจัดจ้างใหม่");
  });
});

describe("TenderProjectsPage — populated", () => {
  it("requests the first page of 20 with no filters", async () => {
    const queries = serveList([COMPUTERS]);

    const { queryClient } = await renderPage();
    await settled(queryClient);

    expect(queries).toHaveLength(1);
    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("renders every project as a table row and as a card", async () => {
    serveList([COMPUTERS, DESKS], { total: 2 });

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("จัดซื้อโต๊ะทำงาน")).toBeInTheDocument();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(within(cards[1]).getByRole("link")).toHaveTextContent("TP-2569-002");
  });

  it("links each project to its detail page", async () => {
    serveList([COMPUTERS, DESKS]);

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getByRole("link", { name: "TP-2569-002" })).toHaveAttribute(
      "href",
      "/dashboard/tender-projects/detail?id=2",
    );
  });

  it("shows the stats from meta", async () => {
    serveList([COMPUTERS], {
      stats: makeTenderProjectStats({ totalCount: 1234, inProgressCount: 56, completedCount: 7, totalBudget: 294_540_000 }),
    });

    await renderPage();

    expect(await screen.findByText("฿294.54 ล้าน")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("56")).toBeInTheDocument();
  });

  it("shows the total from meta in the pagination footer", async () => {
    serveList([COMPUTERS], { total: 45, lastPage: 3 });

    await renderPage();

    expect(await screen.findByText("Found 45 results")).toBeInTheDocument();
  });

  it("goes to the next page and keeps the other params", async () => {
    serveList([COMPUTERS], { total: 45, lastPage: 3 });
    const { user } = await renderPage(`${BASE}?status=draft`);
    await screen.findByText("Found 45 results");

    await user.click(screen.getByRole("button", { name: "Go to next page" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?status=draft&page=2`, { scroll: false });
  });
});

describe("TenderProjectsPage — status permission", () => {
  it("shows read-only badges without tender_projects.updateStatus", async () => {
    serveList([COMPUTERS]);
    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["tender_projects.viewAny"] });
    await settled(queryClient);

    const table = screen.getByRole("table");
    expect(within(table).getByText("ร่าง")).toBeInTheDocument();
    expect(within(table).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows status selects with tender_projects.updateStatus and patches the row's project", async () => {
    serveList([COMPUTERS, DESKS]);
    const patched: unknown[] = [];
    server.use(
      http.patch(apiUrl("/api/v1/dashboard/tender-projects/:id/status"), async ({ params, request }) => {
        patched.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ data: makeTenderProject({ id: 2, status: "closed" }) });
      }),
    );
    const { user } = await renderPage(BASE, { id: 1000, permissions: ["tender_projects.updateStatus"] });
    const table = await loadedTable();

    const selects = within(table).getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    await user.click(selects[1]);
    await user.click(await screen.findByRole("option", { name: "ปิดรับซอง" }));

    await waitFor(() => expect(patched).toEqual([{ id: "2", body: { status: "closed" } }]));
  });
});

describe("TenderProjectsPage — URL reaches the request", () => {
  it("sends every parameter from the URL", async () => {
    const queries = serveList([COMPUTERS], { currentPage: 2, perPage: 10, lastPage: 3, total: 25 });
    const year = FISCAL_YEAR_OPTIONS[1].value;

    await renderPage(
      `${BASE}?search=%E0%B8%84%E0%B8%AD%E0%B8%A1&status=published&department_id=2&fiscal_year=${year}` +
        `&date_from=2026-01-05&date_to=2026-06-30&sort_by=budget&sort_direction=asc&page=2&per_page=10`,
    );
    const input = await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({
      search: "คอม",
      status: "published",
      department_id: "2",
      fiscal_year: year,
      date_from: "2026-01-05",
      date_to: "2026-06-30",
      sort_by: "budget",
      sort_direction: "asc",
      page: "2",
      per_page: "10",
    });
    expect(input).toHaveValue("คอม");
  });

  it("shows the URL values in the draft controls", async () => {
    serveList([COMPUTERS]);
    const year = FISCAL_YEAR_OPTIONS[2];

    const { queryClient } = await renderPage(
      `${BASE}?status=closed&department_id=2&fiscal_year=${year.value}&date_from=2026-01-05&date_to=2026-06-30&sort_by=name&sort_direction=desc`,
    );
    await settled(queryClient);

    expect(comboWithText("ปิดรับซอง")).toBeInTheDocument();
    expect(comboWithText("บัญชี")).toBeInTheDocument();
    expect(comboWithText(year.label)).toBeInTheDocument();
    expect(comboWithText("ชื่อโครงการ ฮ → ก")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5 ม\.ค\. \d{4} ถึง 30 มิ\.ย\. \d{4}/ })).toBeInTheDocument();
  });

  it("ignores an unknown status", async () => {
    const queries = serveList([COMPUTERS]);

    const { queryClient } = await renderPage(`${BASE}?status=banned`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("สถานะ")).toBeInTheDocument();
  });

  it("treats status=all as no filter", async () => {
    const queries = serveList([COMPUTERS]);

    const { queryClient } = await renderPage(`${BASE}?status=all`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it.each([["abc"], ["0"], ["-3"], ["1.5"], [""]])("ignores department_id=%j", async (value) => {
    const queries = serveList([COMPUTERS]);

    const { queryClient } = await renderPage(`${BASE}?department_id=${value}`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("แผนก")).toBeInTheDocument();
  });

  it("ignores an unknown sort column", async () => {
    const queries = serveList([COMPUTERS]);

    const { queryClient } = await renderPage(`${BASE}?sort_by=password&sort_direction=asc`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("เพิ่มล่าสุด")).toBeInTheDocument();
  });

  it("sorts descending by default when only the column is given", async () => {
    const queries = serveList([COMPUTERS]);

    const { queryClient } = await renderPage(`${BASE}?sort_by=project_code`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({
      sort_by: "project_code",
      sort_direction: "desc",
      page: "1",
      per_page: "20",
    });
    expect(comboWithText("รหัสโครงการ ใหม่ → เก่า")).toBeInTheDocument();
  });
});

describe("TenderProjectsPage — active filter count", () => {
  it.each([
    ["no filter", BASE, "ตัวกรอง"],
    ["search only", `${BASE}?search=abc`, "ตัวกรอง"],
    ["sort only", `${BASE}?sort_by=name&sort_direction=asc`, "ตัวกรอง"],
    ["status", `${BASE}?status=draft`, "ตัวกรอง (ใช้อยู่ 1)"],
    ["status and department", `${BASE}?status=draft&department_id=1`, "ตัวกรอง (ใช้อยู่ 2)"],
    ["a start date alone", `${BASE}?date_from=2026-01-01`, "ตัวกรอง (ใช้อยู่ 1)"],
    ["an end date alone", `${BASE}?date_to=2026-01-01`, "ตัวกรอง (ใช้อยู่ 1)"],
    ["both dates as one filter", `${BASE}?date_from=2026-01-01&date_to=2026-02-01`, "ตัวกรอง (ใช้อยู่ 1)"],
    [
      "all four filters",
      `${BASE}?status=draft&department_id=1&fiscal_year=${FISCAL_YEAR_OPTIONS[1].value}&date_from=2026-01-01`,
      "ตัวกรอง (ใช้อยู่ 4)",
    ],
  ])("counts %s", async (_name, url, label) => {
    serveList([COMPUTERS]);

    const { queryClient } = await renderPage(url);
    await settled(queryClient);

    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });
});

describe("TenderProjectsPage — submitting filters", () => {
  it("keeps the filters as a draft until the search button is pressed", async () => {
    const queries = serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.click(comboWithText("สถานะ"));
    await user.click(await screen.findByRole("option", { name: "ปิดรับซอง" }));
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "คอม" } });

    expect(comboWithText("ปิดรับซอง")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(queries).toHaveLength(1);
  });

  it("writes the draft filters to the URL on submit and resets the page", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage(`${BASE}?page=3`);
    await settled(queryClient);

    await user.click(comboWithText("สถานะ"));
    await user.click(await screen.findByRole("option", { name: "ปิดรับซอง" }));
    await user.click(comboWithText("แผนก"));
    await user.click(await screen.findByRole("option", { name: "บัญชี" }));
    await user.click(comboWithText("ปีงบประมาณ"));
    await user.click(await screen.findByRole("option", { name: FISCAL_YEAR_OPTIONS[1].label }));
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(
      `${BASE}?status=closed&department_id=2&fiscal_year=${FISCAL_YEAR_OPTIONS[1].value}`,
      { scroll: false },
    );
  });

  it("writes a picked date range to the URL on submit", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ระยะเวลาโครงการ" }));
    await user.click(await screen.findByRole("button", { name: "วันอังคารที่ 10 พฤศจิกายน 2026" }));
    await user.click(await screen.findByRole("button", { name: "วันศุกร์ที่ 20 พฤศจิกายน 2026" }));
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?date_from=2026-11-10&date_to=2026-11-20`, {
      scroll: false,
    });
  });

  it("submits a trimmed search when enter is pressed", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "  คอม  {Enter}");

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?search=%E0%B8%84%E0%B8%AD%E0%B8%A1`, {
      scroll: false,
    });
  });

  it("drops filters that were reset to all and keeps the rest", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage(`${BASE}?status=draft&department_id=2&per_page=10`);
    await settled(queryClient);

    await user.click(comboWithText("ร่าง"));
    await user.click(await screen.findByRole("option", { name: "ทั้งหมด" }));
    await user.click(comboWithText("บัญชี"));
    await user.click(await screen.findByRole("option", { name: "ทุกหน่วยงาน" }));
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?per_page=10`, { scroll: false });
  });

  it("applies the sort chosen in the sort select on submit", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "งบประมาณ มาก → น้อย" }));
    expect(router.replace).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=budget&sort_direction=desc`, {
      scroll: false,
    });
  });

  it("removes the sort from the URL when the latest order is chosen", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage(`${BASE}?sort_by=name&sort_direction=asc`);
    await settled(queryClient);

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "เพิ่มล่าสุด" }));
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(BASE, { scroll: false });
  });

  it("follows a sort changed from the table header so a later submit does not revert it", async () => {
    serveList([COMPUTERS]);
    const { queryClient, rerender } = await renderPage(`${BASE}?sort_by=name&sort_direction=asc`);
    await settled(queryClient);
    expect(comboWithText("ชื่อโครงการ ก → ฮ")).toBeInTheDocument();

    setUrl(`${BASE}?sort_by=budget&sort_direction=desc`);
    rerender(<TenderProjectsPage />);

    await waitFor(() => expect(comboWithText("งบประมาณ มาก → น้อย")).toBeInTheDocument());
  });

  it("opens the sheet and applies the filters from there", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage(`${BASE}?status=draft`);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 1)" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "แสดงผล" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?status=draft`, { scroll: false });
  });
});

describe("TenderProjectsPage — clearing filters", () => {
  const FULL = `${BASE}?search=abc&status=draft&department_id=2&fiscal_year=${FISCAL_YEAR_OPTIONS[1].value}&date_from=2026-01-01&date_to=2026-02-01&sort_by=name&sort_direction=asc&page=2&per_page=10`;

  it("clears search and every filter but keeps the sort and page size", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage(FULL);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=name&sort_direction=asc&per_page=10`, {
      scroll: false,
    });
  });

  it("resets the draft controls", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage(FULL);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("");
    expect(comboWithText("สถานะ")).toBeInTheDocument();
    expect(comboWithText("แผนก")).toBeInTheDocument();
    expect(comboWithText("ปีงบประมาณ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ระยะเวลาโครงการ" })).toBeInTheDocument();
  });

  it("clears from the compact button next to the sheet trigger too", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage(`${BASE}?status=draft`);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ล้างการค้นหาและตัวกรอง" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(BASE, { scroll: false });
  });
});

describe("TenderProjectsPage — sorting from the table", () => {
  it.each([
    ["รหัสโครงการ", "project_code"],
    ["โครงการ / หน่วยงาน", "name"],
    ["งบประมาณ", "budget"],
  ])("sorts by %s from the header", async (label, id) => {
    serveList([COMPUTERS]);
    const { user } = await renderPage();
    const table = await loadedTable();

    await user.click(within(table).getByRole("button", { name: label }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=${id}&sort_direction=asc`, {
      scroll: false,
    });
  });
});

describe("TenderProjectsPage — skeleton while refetching", () => {
  it("shows the skeleton instead of stale rows after a filter change, then the new rows", async () => {
    serveList([COMPUTERS]);
    const { user, rerender, queryClient } = await renderPage();
    await settled(queryClient);
    await screen.findAllByText("จัดซื้อคอมพิวเตอร์");

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(LIST_URL, async () => {
        await gate;
        return HttpResponse.json(paginated([DESKS], { stats: makeTenderProjectStats() }));
      }),
    );
    await user.click(comboWithText("สถานะ"));
    await user.click(await screen.findByRole("option", { name: "กำลังดำเนินการ" }));
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));
    setUrl(`${BASE}?status=published`);
    rerender(<TenderProjectsPage />);

    await waitFor(() => expect(screen.queryAllByText("จัดซื้อคอมพิวเตอร์")).toHaveLength(0));
    expect(within(screen.getByRole("table")).getAllByRole("columnheader")).toHaveLength(8);
    expect(screen.queryByRole("link", { name: "TP-2569-002" })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();

    act(() => release());

    expect((await screen.findAllByText("จัดซื้อโต๊ะทำงาน")).length).toBe(2);
  });
});

describe("TenderProjectsPage — empty and error states", () => {
  it.each([
    [BASE, "ยังไม่มีโครงการในระบบ"],
    [`${BASE}?status=draft`, "ไม่พบโครงการที่ตรงกับเงื่อนไขที่เลือก"],
    [`${BASE}?department_id=2`, "ไม่พบโครงการที่ตรงกับเงื่อนไขที่เลือก"],
    [`${BASE}?fiscal_year=2569`, "ไม่พบโครงการที่ตรงกับเงื่อนไขที่เลือก"],
    [`${BASE}?date_from=2026-01-01`, "ไม่พบโครงการที่ตรงกับเงื่อนไขที่เลือก"],
    [`${BASE}?search=xyz`, "ไม่พบโครงการที่ตรงกับคำค้นหา"],
    [`${BASE}?search=xyz&status=draft`, "ไม่พบโครงการที่ตรงกับคำค้นหา"],
  ])("shows the right empty message for %s", async (url, message) => {
    serveList([]);

    await renderPage(url);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getAllByText(/ไม่พบโครงการที่ตรง|ยังไม่มีโครงการในระบบ/)).toHaveLength(1);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it.each([
    ["500", 500],
    ["404", 404],
    ["403", 403],
  ])("shows the error message with the filter bar and no skeleton on a %s", async (_name, status) => {
    server.use(
      http.get(LIST_URL, () => HttpResponse.json({ message: "ผิดพลาด" }, { status })),
      http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: DEPARTMENTS })),
    );

    const { container } = await renderPage();

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
  });

  it("shows zeros in the stats when the list failed", async () => {
    server.use(
      http.get(LIST_URL, () => new HttpResponse(null, { status: 500 })),
      http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: [] })),
    );

    await renderPage();

    await screen.findByText(ERROR_TEXT);
    expect(screen.getByText("฿0")).toBeInTheDocument();
  });
});

describe("TenderProjectsPage — permissions", () => {
  it("shows the page to a user holding tender_projects.viewAny", async () => {
    serveList([COMPUTERS]);

    await renderPage(BASE, { id: 1000, permissions: ["tender_projects.viewAny"] });

    expect(await screen.findByRole("heading", { name: HEADING })).toBeInTheDocument();
    expect(await screen.findAllByText("จัดซื้อคอมพิวเตอร์")).toHaveLength(2);
  });

  it("shows Forbidden and sends no list request without tender_projects.viewAny", async () => {
    const queries = serveList([COMPUTERS]);
    setUrl(BASE);
    signInAs({ id: 1000, permissions: [] });
    renderWithQueryClient(<TenderProjectsPage />);

    expect(await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeInTheDocument();
    expect(queries).toHaveLength(0);
  });

  it("hides the create button without tender_projects.create", async () => {
    serveList([COMPUTERS]);

    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["tender_projects.viewAny"] });
    await settled(queryClient);

    expect(screen.queryByRole("button", { name: "สร้างโครงการใหม่" })).not.toBeInTheDocument();
  });

  it("hides the table edit and delete buttons with only tender_projects.viewAny", async () => {
    serveList([COMPUTERS]);

    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["tender_projects.viewAny"] });
    await settled(queryClient);

    const table = screen.getByRole("table");
    expect(within(table).queryByRole("button", { name: "แก้ไขโครงการ" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: "ลบโครงการ" })).not.toBeInTheDocument();
  });

  it("shows only the table edit button with tender_projects.update", async () => {
    serveList([COMPUTERS]);

    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["tender_projects.viewAny", "tender_projects.update"] });
    await settled(queryClient);

    const table = screen.getByRole("table");
    expect(within(table).getByRole("button", { name: "แก้ไขโครงการ" })).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: "ลบโครงการ" })).not.toBeInTheDocument();
  });

  it("shows only the table delete button with tender_projects.delete", async () => {
    serveList([COMPUTERS]);

    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["tender_projects.viewAny", "tender_projects.delete"] });
    await settled(queryClient);

    const table = screen.getByRole("table");
    expect(within(table).queryByRole("button", { name: "แก้ไขโครงการ" })).not.toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "ลบโครงการ" })).toBeInTheDocument();
  });

  it("hides the card menu with only tender_projects.viewAny", async () => {
    serveList([COMPUTERS]);

    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["tender_projects.viewAny"] });
    await settled(queryClient);

    expect(screen.queryByRole("button", { name: "ตัวเลือกของโครงการ" })).not.toBeInTheDocument();
  });

  it("offers only edit in the card menu with tender_projects.update", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage(BASE, { id: 1000, permissions: ["tender_projects.viewAny", "tender_projects.update"] });
    await settled(queryClient);

    await user.click(within(screen.getByRole("article")).getByRole("button", { name: "ตัวเลือกของโครงการ" }));

    expect(await screen.findByRole("menuitem", { name: "แก้ไข" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "ลบ" })).not.toBeInTheDocument();
  });

  it("offers only delete in the card menu with tender_projects.delete", async () => {
    serveList([COMPUTERS]);
    const { user, queryClient } = await renderPage(BASE, { id: 1000, permissions: ["tender_projects.viewAny", "tender_projects.delete"] });
    await settled(queryClient);

    await user.click(within(screen.getByRole("article")).getByRole("button", { name: "ตัวเลือกของโครงการ" }));

    expect(await screen.findByRole("menuitem", { name: "ลบ" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "แก้ไข" })).not.toBeInTheDocument();
  });
});

describe("TenderProjectsPage — invalid URL params", () => {
  it.skip.each([
    ["fiscal_year", "abc"],
    ["date_from", "garbage"],
    ["date_to", "garbage"],
  ])("BUG: use-tender-project-list-page.ts:63-65 %s=%s is passed to the API unvalidated — it should be ignored, not counted as a filter", async (key, value) => {
    const queries = serveList([COMPUTERS]);

    const { queryClient } = await renderPage(`${BASE}?${key}=${value}`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(screen.getByRole("button", { name: "ตัวกรอง" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ตัวกรอง (ใช้อยู่ 1)" })).not.toBeInTheDocument();
  });

  it("treats an unknown sort_direction as descending when a sort column is given", async () => {
    const queries = serveList([COMPUTERS]);

    const { queryClient } = await renderPage(`${BASE}?sort_by=name&sort_direction=sideways`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ sort_by: "name", sort_direction: "desc", page: "1", per_page: "20" });
    expect(comboWithText("ชื่อโครงการ ฮ → ก")).toBeInTheDocument();
  });

  it("sends no sort at all for a sort_direction without a sort column", async () => {
    const queries = serveList([COMPUTERS]);

    const { queryClient } = await renderPage(`${BASE}?sort_direction=sideways`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("เพิ่มล่าสุด")).toBeInTheDocument();
  });
});

describe("TenderProjectsPage — list hook against stale input", () => {
  it("does not request again when only the draft search text changes", async () => {
    const queries = serveList([COMPUTERS]);
    const { queryClient } = await renderPage();
    await settled(queryClient);
    const input = screen.getByPlaceholderText(PLACEHOLDER);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.change(input, { target: { value: "คอม" } });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    } finally {
      vi.useRealTimers();
    }

    expect(router.replace).not.toHaveBeenCalled();
    expect(queries).toHaveLength(1);
  });
});
