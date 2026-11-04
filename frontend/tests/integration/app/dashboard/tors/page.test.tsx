import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import TorsPage from "@/app/dashboard/tors/page";
import type { CurrentUser } from "@/lib/auth/types";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { routes } from "@/lib/routes";
import { FISCAL_YEAR_OPTIONS } from "@/lib/tender/fiscal-year-options";
import type { Tor } from "@/lib/tender/tor/types";
import { makeDepartment } from "@/tests/fixtures/internal-profiles";
import { paginated } from "@/tests/fixtures/pagination";
import { makeTenderProjectOption } from "@/tests/fixtures/tender-projects";
import { makeTor } from "@/tests/fixtures/tors";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/tors");
const DEPARTMENTS_URL = apiUrl("/api/v1/dashboard/departments/select");
const PROJECTS_URL = apiUrl("/api/v1/dashboard/tender-projects/select");
const PLACEHOLDER = "ค้นหาชื่อ TOR | รหัส TOR";
const HEADING = "การจัดการ TOR";
const BASE = "/dashboard/tors";
const ERROR_TEXT = "ไม่สามารถโหลดข้อมูล TOR ได้ กรุณาลองใหม่อีกครั้ง";
const FORBIDDEN = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้";
const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const PROJECTS = [
  makeTenderProjectOption({ id: 7, projectCode: "TP-2569-007", name: "จัดซื้อคอมพิวเตอร์" }),
  makeTenderProjectOption({ id: 8, projectCode: "TP-2569-008", name: "จัดซื้อโต๊ะทำงาน" }),
];
const PROJECT_7 = "TP-2569-007 · จัดซื้อคอมพิวเตอร์";
const YEAR = FISCAL_YEAR_OPTIONS[1];

const NOTEBOOKS = makeTor({
  id: 1,
  torCode: "TOR-2569-001",
  title: "จัดซื้อโน้ตบุ๊ก",
  status: "draft",
  budgetEstimate: "500000.00",
  biddingEndAt: "2026-11-20T16:00:00+07:00",
  department: { id: 1, name: "จัดซื้อ" },
  tenderProject: { id: 7, projectCode: "TP-2569-007", name: "จัดซื้อคอมพิวเตอร์" },
});
const PRINTERS = makeTor({
  id: 2,
  torCode: "TOR-2569-002",
  title: "จัดซื้อเครื่องพิมพ์",
  status: "approved",
  budgetEstimate: "120000.50",
  department: { id: 2, name: "บัญชี" },
  tenderProject: null,
});

// ช่วงรับซองคำนวณ "เหลือ N วัน" จากเวลาปัจจุบัน
freezeTimeAt("2026-11-02T10:00:00+07:00");

function serveList(tors: Tor[], meta: Record<string, unknown> = {}) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get(LIST_URL, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(paginated(tors, meta));
    }),
    http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: DEPARTMENTS })),
    http.get(PROJECTS_URL, () => HttpResponse.json({ data: PROJECTS })),
  );
  return queries;
}

// ค่าเริ่มต้น = ดูได้ทุกรายการ (tors.viewAny) — เคสที่ทดสอบการปฏิเสธส่ง permissions ที่จำกัดเองทุกครั้ง
async function renderPage(url = BASE, auth: Partial<CurrentUser> = { id: 1000, permissions: ["tors.viewAny"] }) {
  setUrl(url);
  signInAs(auth);
  const rendered = renderWithQueryClient(<TorsPage />);
  return { ...rendered, user: userEvent.setup() };
}

const labelOf = (c: HTMLElement) => (c.textContent ?? "").replace("▼", "");
const comboWithText = (text: string) => screen.getAllByRole("combobox").find((c) => labelOf(c) === text)!;
const qs = (params: Record<string, string>) => `${BASE}?${new URLSearchParams(params).toString()}`;

// รอให้ filter bar ขึ้น แล้วรอให้ list, ตัวเลือก และ /auth/user โหลดครบ
async function settled(queryClient: { isFetching: () => number }) {
  await screen.findByPlaceholderText(PLACEHOLDER);
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
}

// ตารางแรกที่เจอคือ skeleton ระหว่างโหลด จึงรอให้ชื่อ TOR แถวแรกขึ้นก่อนค่อยหยิบตารางจริง
async function loadedTable(title = NOTEBOOKS.title) {
  await screen.findAllByText(title);
  return screen.getByRole("table");
}

describe("TorsPage — permission gate", () => {
  it.each(["tors.viewAny", "tors.viewDepartment", "tors.viewOwn"])(
    "shows the page to a user holding only %s",
    async (permission) => {
      serveList([NOTEBOOKS]);

      await renderPage(BASE, { id: 1000, permissions: [permission] });

      expect(await screen.findByRole("heading", { name: HEADING })).toBeInTheDocument();
      expect(await screen.findAllByText(NOTEBOOKS.title)).toHaveLength(2);
    },
  );

  it.each([
    ["no permission", []],
    ["only create/update/delete permissions", ["tors.create", "tors.update", "tors.delete"]],
    ["a permission from another module", ["tender_projects.viewAny"]],
  ])("shows Forbidden and sends no data request with %s", async (_name, permissions) => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(BASE, { id: 1000, permissions });

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(queries).toEqual([]);
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
  });

  it("shows only a spinner, no heading and no data request, while the user is still loading", async () => {
    const queries = serveList([NOTEBOOKS]);
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));
    setUrl(BASE);

    renderWithQueryClient(<TorsPage />);

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    expect(queries).toEqual([]);
  });
});

describe("TorsPage — shell and loading", () => {
  it("shows the heading, the description and the filter bar while the list is loading", async () => {
    server.use(
      http.get(LIST_URL, () => new Promise<never>(() => {})),
      http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: [] })),
      http.get(PROJECTS_URL, () => HttpResponse.json({ data: [] })),
    );

    await renderPage();

    expect(await screen.findByRole("heading", { name: HEADING })).toBeInTheDocument();
    expect(screen.getByText("ภาพรวมทั้งหมดและ TOR ที่เกี่ยวข้อง")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
  });

  it("shows the table skeleton while the list is loading", async () => {
    server.use(
      http.get(LIST_URL, () => new Promise<never>(() => {})),
      http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: [] })),
      http.get(PROJECTS_URL, () => HttpResponse.json({ data: [] })),
    );

    await renderPage();

    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(7);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
  });

  it("sets the breadcrumb", async () => {
    serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage();
    await settled(queryClient);

    expect(useBreadcrumbStore.getState().items).toEqual([{ label: HEADING }]);
  });
});

describe("TorsPage — populated", () => {
  it("requests the first page of 20 with no filters", async () => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage();
    await settled(queryClient);

    expect(queries).toHaveLength(1);
    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("renders every TOR as a table row and as a card", async () => {
    serveList([NOTEBOOKS, PRINTERS], { total: 2 });

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("จัดซื้อเครื่องพิมพ์")).toBeInTheDocument();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(within(cards[1]).getByRole("link")).toHaveTextContent("จัดซื้อเครื่องพิมพ์");
  });

  it("shows the key fields of each TOR in its row", async () => {
    serveList([NOTEBOOKS, PRINTERS]);

    await renderPage();

    const table = await loadedTable();
    const first = within(within(table).getAllByRole("row")[1]);
    expect(first.getByRole("link", { name: "TOR-2569-001" })).toBeInTheDocument();
    expect(first.getByRole("link", { name: "จัดซื้อคอมพิวเตอร์" })).toHaveAttribute(
      "href",
      routes.dashboards.tender_project.detail(7),
    );
    expect(first.getByText("500,000")).toBeInTheDocument();
    expect(first.getByText("ร่าง")).toBeInTheDocument();
    expect(first.getByText("เมื่อประกาศ – 20 พ.ย. 26")).toBeInTheDocument();
    expect(first.getByText("กำหนดการ")).toBeInTheDocument();
    const second = within(within(table).getAllByRole("row")[2]);
    expect(second.getByText("120,000.5")).toBeInTheDocument();
    expect(second.getByText("อนุมัติแล้ว")).toBeInTheDocument();
    expect(second.getByText("-")).toBeInTheDocument();
  });

  it("links each TOR to its detail page", async () => {
    serveList([NOTEBOOKS, PRINTERS]);

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getByRole("link", { name: "TOR-2569-002" })).toHaveAttribute(
      "href",
      routes.dashboards.tors.detail(2),
    );
    expect(within(table).getByRole("link", { name: /จัดซื้อโน้ตบุ๊ก/ })).toHaveAttribute(
      "href",
      routes.dashboards.tors.detail(1),
    );
  });

  it("shows the total from meta in the pagination footer", async () => {
    serveList([NOTEBOOKS], { total: 45, lastPage: 3 });

    await renderPage();

    expect(await screen.findByText("Found 45 results")).toBeInTheDocument();
  });

  it("goes to the next page and keeps the other params", async () => {
    serveList([NOTEBOOKS], { total: 45, lastPage: 3 });
    const { user } = await renderPage(`${BASE}?status=draft`);
    await screen.findByText("Found 45 results");

    await user.click(screen.getByRole("button", { name: "Go to next page" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?status=draft&page=2`, { scroll: false });
  });
});

describe("TorsPage — URL reaches the request", () => {
  it("sends every parameter from the URL and shows them in the controls", async () => {
    const queries = serveList([NOTEBOOKS], { currentPage: 2, perPage: 10, lastPage: 3, total: 25 });

    const { queryClient } = await renderPage(
      qs({
        search: "คอม",
        status: "approved",
        department_id: "2",
        fiscal_year: YEAR.value,
        procurement_method: "คัดเลือก",
        tender_project_id: "7",
        sort_by: "bidding_end_at",
        sort_direction: "asc",
        page: "2",
        per_page: "10",
      }),
    );
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({
      search: "คอม",
      status: "approved",
      department_id: "2",
      fiscal_year: YEAR.value,
      procurement_method: "คัดเลือก",
      tender_project_id: "7",
      sort_by: "bidding_end_at",
      sort_direction: "asc",
      page: "2",
      per_page: "10",
    });
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("คอม");
    expect(comboWithText("อนุมัติแล้ว")).toBeInTheDocument();
    expect(comboWithText("บัญชี")).toBeInTheDocument();
    expect(comboWithText(YEAR.label)).toBeInTheDocument();
    expect(comboWithText("คัดเลือก")).toBeInTheDocument();
    expect(comboWithText(PROJECT_7)).toBeInTheDocument();
    expect(comboWithText("ปิดรับซอง ใกล้ → ไกล")).toBeInTheDocument();
  });

  it("sends tender_project_id=none and shows the no-project choice", async () => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?tender_project_id=none`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ tender_project_id: "none", page: "1", per_page: "20" });
    expect(comboWithText("ไม่สังกัดโครงการ")).toBeInTheDocument();
  });

  it("shows the project placeholder for a project id missing from the options but still sends it", async () => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?tender_project_id=999`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ tender_project_id: "999", page: "1", per_page: "20" });
    expect(comboWithText("โครงการ")).toBeInTheDocument();
  });

  it("ignores an unknown status", async () => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?status=banned`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("สถานะ")).toBeInTheDocument();
  });

  it("treats status=all as no filter", async () => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?status=all`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("ignores a procurement method that is not one of the known methods", async () => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(qs({ procurement_method: "วิธีลับ" }));
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("วิธีจัดซื้อจัดจ้าง")).toBeInTheDocument();
  });

  it.each([["abc"], ["0"], ["-3"], ["1.5"], [""]])("ignores department_id=%j", async (value) => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?department_id=${value}`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("หน่วยงาน")).toBeInTheDocument();
  });

  it.each([["abc"], ["0"], ["-3"], ["1.5"], [""]])("ignores fiscal_year=%j", async (value) => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?fiscal_year=${value}`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("ปีงบประมาณ")).toBeInTheDocument();
  });

  it.each([["abc"], ["0"], ["-3"], ["1.5"], [""], ["None"]])("ignores tender_project_id=%j", async (value) => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?tender_project_id=${value}`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("โครงการ")).toBeInTheDocument();
  });

  it.each([
    ["an unknown column", "sort_by=password&sort_direction=asc"],
    // created_at คือลำดับ default ของ backend ("เพิ่มล่าสุด") ไม่ใช่คอลัมน์ที่เลือกเรียงได้
    ["created_at", "sort_by=created_at&sort_direction=asc"],
    ["a direction without a column", "sort_direction=asc"],
  ])("sends no sort for %s", async (_name, query) => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?${query}`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("เพิ่มล่าสุด")).toBeInTheDocument();
  });

  it("sorts descending by default when only the column is given", async () => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?sort_by=tor_code`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({
      sort_by: "tor_code",
      sort_direction: "desc",
      page: "1",
      per_page: "20",
    });
    expect(comboWithText("รหัส TOR ใหม่ → เก่า")).toBeInTheDocument();
  });

  it("accepts fiscal_year as a sort column, which only the sort select can set", async () => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?sort_by=fiscal_year&sort_direction=asc`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({
      sort_by: "fiscal_year",
      sort_direction: "asc",
      page: "1",
      per_page: "20",
    });
    expect(comboWithText("ปีงบประมาณ เก่า → ใหม่")).toBeInTheDocument();
  });

  it.each([["abc"], ["0"], ["-2"]])("falls back to page 1 of 20 for page=%s", async (value) => {
    const queries = serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(`${BASE}?page=${value}&per_page=${value}`);
    await settled(queryClient);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });
});

describe("TorsPage — active filter count", () => {
  it.each([
    ["no filter", BASE, "ตัวกรอง"],
    ["search only", `${BASE}?search=abc`, "ตัวกรอง"],
    ["sort only", `${BASE}?sort_by=title&sort_direction=asc`, "ตัวกรอง"],
    ["status", `${BASE}?status=draft`, "ตัวกรอง (ใช้อยู่ 1)"],
    ["status and department", `${BASE}?status=draft&department_id=1`, "ตัวกรอง (ใช้อยู่ 2)"],
    ["fiscal year", `${BASE}?fiscal_year=${YEAR.value}`, "ตัวกรอง (ใช้อยู่ 1)"],
    ["procurement method", qs({ procurement_method: "คัดเลือก" }), "ตัวกรอง (ใช้อยู่ 1)"],
    ["a tender project id", `${BASE}?tender_project_id=7`, "ตัวกรอง (ใช้อยู่ 1)"],
    ["the no-project choice", `${BASE}?tender_project_id=none`, "ตัวกรอง (ใช้อยู่ 1)"],
    ["an ignored invalid value", `${BASE}?department_id=abc&status=banned`, "ตัวกรอง"],
    [
      "all five filters",
      qs({
        status: "draft",
        department_id: "1",
        fiscal_year: YEAR.value,
        procurement_method: "คัดเลือก",
        tender_project_id: "none",
      }),
      "ตัวกรอง (ใช้อยู่ 5)",
    ],
  ])("counts %s", async (_name, url, label) => {
    serveList([NOTEBOOKS]);

    const { queryClient } = await renderPage(url);
    await settled(queryClient);

    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });
});

describe("TorsPage — submitting filters", () => {
  it("keeps the filters as a draft until the search button is pressed", async () => {
    const queries = serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.click(comboWithText("สถานะ"));
    await user.click(await screen.findByRole("option", { name: "อนุมัติแล้ว" }));
    await user.click(comboWithText("โครงการ"));
    await user.click(await screen.findByRole("option", { name: "ไม่สังกัดโครงการ" }));
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: "คอม" } });

    expect(comboWithText("อนุมัติแล้ว")).toBeInTheDocument();
    expect(comboWithText("ไม่สังกัดโครงการ")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    expect(queries).toHaveLength(1);
  });

  it("writes every draft filter to the URL on submit and resets the page", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(`${BASE}?page=3`);
    await settled(queryClient);

    await user.click(comboWithText("สถานะ"));
    await user.click(await screen.findByRole("option", { name: "อนุมัติแล้ว" }));
    await user.click(comboWithText("หน่วยงาน"));
    await user.click(await screen.findByRole("option", { name: "บัญชี" }));
    await user.click(comboWithText("ปีงบประมาณ"));
    await user.click(await screen.findByRole("option", { name: YEAR.label }));
    await user.click(comboWithText("วิธีจัดซื้อจัดจ้าง"));
    await user.click(await screen.findByRole("option", { name: "คัดเลือก" }));
    await user.click(comboWithText("โครงการ"));
    await user.click(await screen.findByRole("option", { name: PROJECT_7 }));
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "คอม");
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(
      qs({
        search: "คอม",
        status: "approved",
        department_id: "2",
        fiscal_year: YEAR.value,
        procurement_method: "คัดเลือก",
        tender_project_id: "7",
      }),
      { scroll: false },
    );
  });

  it("writes the no-project choice as tender_project_id=none", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.click(comboWithText("โครงการ"));
    await user.click(await screen.findByRole("option", { name: "ไม่สังกัดโครงการ" }));
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?tender_project_id=none`, { scroll: false });
  });

  it("submits a trimmed search when enter is pressed", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "  คอม  {Enter}");

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(qs({ search: "คอม" }), { scroll: false });
  });

  it("drops a search that is only spaces", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(`${BASE}?search=abc`);
    await settled(queryClient);

    await user.clear(screen.getByPlaceholderText(PLACEHOLDER));
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "   {Enter}");

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(BASE, { scroll: false });
  });

  it("drops filters that were reset to all and keeps the rest", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(`${BASE}?status=draft&department_id=2&tender_project_id=7&per_page=10`);
    await settled(queryClient);

    await user.click(comboWithText("ร่าง"));
    await user.click(await screen.findByRole("option", { name: "ทั้งหมด" }));
    await user.click(comboWithText("บัญชี"));
    await user.click(await screen.findByRole("option", { name: "ทุกหน่วยงาน" }));
    await user.click(comboWithText(PROJECT_7));
    await user.click(await screen.findByRole("option", { name: "ทุกโครงการ" }));
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?per_page=10`, { scroll: false });
  });

  it("applies the sort chosen in the sort select on submit", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "ราคากลาง มาก → น้อย" }));
    expect(router.replace).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=budget_estimate&sort_direction=desc`, {
      scroll: false,
    });
  });

  it("removes the sort from the URL when the latest order is chosen", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(`${BASE}?sort_by=title&sort_direction=asc`);
    await settled(queryClient);

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "เพิ่มล่าสุด" }));
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(BASE, { scroll: false });
  });

  it("keeps the URL sort when submitting without touching the sort select", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(`${BASE}?sort_by=title&sort_direction=asc&status=draft`);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ค้นหา" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=title&sort_direction=asc&status=draft`, {
      scroll: false,
    });
  });

  it("follows a sort changed from the table header so a later submit does not revert it", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient, rerender } = await renderPage(`${BASE}?sort_by=title&sort_direction=asc`);
    await settled(queryClient);
    expect(comboWithText("ชื่อ TOR ก → ฮ")).toBeInTheDocument();

    setUrl(`${BASE}?sort_by=budget_estimate&sort_direction=desc`);
    rerender(<TorsPage />);

    await waitFor(() => expect(comboWithText("ราคากลาง มาก → น้อย")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));
    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=budget_estimate&sort_direction=desc`, {
      scroll: false,
    });
  });

  it("opens the sheet and applies the filters from there", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(`${BASE}?status=draft`);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 1)" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "แสดงผล" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?status=draft`, { scroll: false });
  });

  it("does not request again when only the draft search text changes", async () => {
    const queries = serveList([NOTEBOOKS]);
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

describe("TorsPage — clearing filters", () => {
  const FULL = qs({
    search: "abc",
    status: "draft",
    department_id: "2",
    fiscal_year: YEAR.value,
    procurement_method: "คัดเลือก",
    tender_project_id: "7",
    sort_by: "title",
    sort_direction: "asc",
    page: "2",
    per_page: "10",
  });

  it("clears search and every filter but keeps the sort and page size", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(FULL);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=title&sort_direction=asc&per_page=10`, {
      scroll: false,
    });
  });

  it("resets every draft control but keeps the chosen sort", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(FULL);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("");
    expect(comboWithText("สถานะ")).toBeInTheDocument();
    expect(comboWithText("หน่วยงาน")).toBeInTheDocument();
    expect(comboWithText("ปีงบประมาณ")).toBeInTheDocument();
    expect(comboWithText("วิธีจัดซื้อจัดจ้าง")).toBeInTheDocument();
    expect(comboWithText("โครงการ")).toBeInTheDocument();
    expect(comboWithText("ชื่อ TOR ก → ฮ")).toBeInTheDocument();
  });

  it("clears from the compact button next to the sheet trigger too", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(`${BASE}?status=draft&tender_project_id=none`);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ล้างการค้นหาและตัวกรอง" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(BASE, { scroll: false });
  });

  it("clears from the sheet", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage(`${BASE}?status=draft`);
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ตัวกรอง (ใช้อยู่ 1)" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "ล้างตัวกรอง" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(BASE, { scroll: false });
  });
});

describe("TorsPage — sorting from the table", () => {
  it.each([
    ["รหัส TOR", "tor_code"],
    ["TOR / หน่วยงาน", "title"],
    ["ราคากลาง", "budget_estimate"],
    ["ช่วงรับซอง", "bidding_end_at"],
  ])("sorts by %s from the header", async (label, id) => {
    serveList([NOTEBOOKS]);
    const { user } = await renderPage();
    const table = await loadedTable();

    await user.click(within(table).getByRole("button", { name: label }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=${id}&sort_direction=asc`, {
      scroll: false,
    });
  });
});

describe("TorsPage — options that fail to load", () => {
  it("still renders the list and offers only the fixed options when departments and projects fail", async () => {
    const queries = serveList([NOTEBOOKS]);
    server.use(
      http.get(DEPARTMENTS_URL, () => HttpResponse.json({ message: "x" }, { status: 500 })),
      http.get(PROJECTS_URL, () => HttpResponse.json({ message: "x" }, { status: 500 })),
    );
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    expect(queries).toHaveLength(1);
    expect(await screen.findAllByText(NOTEBOOKS.title)).toHaveLength(2);
    await user.click(comboWithText("หน่วยงาน"));
    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual(["ทุกหน่วยงาน"]);
    await user.keyboard("{Escape}");
    await user.click(comboWithText("โครงการ"));
    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual([
      "ทุกโครงการ",
      "ไม่สังกัดโครงการ",
    ]);
  });

  it("offers the loaded departments and projects otherwise", async () => {
    serveList([NOTEBOOKS]);
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.click(comboWithText("หน่วยงาน"));
    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual([
      "ทุกหน่วยงาน",
      "จัดซื้อ",
      "บัญชี",
    ]);
    await user.keyboard("{Escape}");
    await user.click(comboWithText("โครงการ"));
    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual([
      "ทุกโครงการ",
      "ไม่สังกัดโครงการ",
      PROJECT_7,
      "TP-2569-008 · จัดซื้อโต๊ะทำงาน",
    ]);
  });
});

describe("TorsPage — skeleton while refetching", () => {
  it("shows the skeleton instead of stale rows after a filter change, then the new rows", async () => {
    serveList([NOTEBOOKS]);
    const { user, rerender, queryClient } = await renderPage();
    await settled(queryClient);
    await screen.findAllByText(NOTEBOOKS.title);

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(LIST_URL, async () => {
        await gate;
        return HttpResponse.json(paginated([PRINTERS]));
      }),
    );
    await user.click(comboWithText("สถานะ"));
    await user.click(await screen.findByRole("option", { name: "อนุมัติแล้ว" }));
    await user.click(screen.getByRole("button", { name: "ค้นหา" }));
    setUrl(`${BASE}?status=approved`);
    rerender(<TorsPage />);

    await waitFor(() => expect(screen.queryAllByText(NOTEBOOKS.title)).toHaveLength(0));
    expect(within(screen.getByRole("table")).getAllByRole("columnheader")).toHaveLength(7);
    expect(screen.queryByRole("link", { name: "TOR-2569-002" })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();

    act(() => release());

    expect(await screen.findAllByText(PRINTERS.title)).toHaveLength(2);
  });
});

describe("TorsPage — empty and error states", () => {
  it.each([
    ["no filter", BASE, "ยังไม่มี TOR ในระบบ"],
    ["only a sort", `${BASE}?sort_by=title`, "ยังไม่มี TOR ในระบบ"],
    ["a status", `${BASE}?status=draft`, "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก"],
    ["a department", `${BASE}?department_id=2`, "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก"],
    ["a fiscal year", `${BASE}?fiscal_year=${YEAR.value}`, "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก"],
    ["a procurement method", qs({ procurement_method: "คัดเลือก" }), "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก"],
    ["a tender project", `${BASE}?tender_project_id=7`, "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก"],
    ["the no-project choice", `${BASE}?tender_project_id=none`, "ไม่พบ TOR ที่ตรงกับเงื่อนไขที่เลือก"],
    ["a search", `${BASE}?search=xyz`, "ไม่พบ TOR ที่ตรงกับคำค้นหา"],
    ["a search and a filter", `${BASE}?search=xyz&status=draft`, "ไม่พบ TOR ที่ตรงกับคำค้นหา"],
    ["only ignored invalid filters", `${BASE}?status=banned&department_id=abc`, "ยังไม่มี TOR ในระบบ"],
  ])("shows the right empty message with %s", async (_name, url, message) => {
    serveList([]);

    await renderPage(url);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getAllByText(/ไม่พบ TOR ที่ตรง|ยังไม่มี TOR ในระบบ/)).toHaveLength(1);
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
      http.get(PROJECTS_URL, () => HttpResponse.json({ data: PROJECTS })),
    );

    const { container } = await renderPage();

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
    expect(screen.queryByText("ยังไม่มี TOR ในระบบ")).not.toBeInTheDocument();
  });
});
