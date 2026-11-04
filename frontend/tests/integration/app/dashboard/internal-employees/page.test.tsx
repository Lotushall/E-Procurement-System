import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import InternalProfilesPage from "@/app/dashboard/internal-employees/page";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { routes } from "@/lib/routes";
import type { InternalProfile } from "@/lib/internal-profiles/types";
import { makeDepartment, makeInternalProfile, makePosition } from "@/tests/fixtures/internal-profiles";
import { paginated } from "@/tests/fixtures/pagination";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/internal-profiles");
const DEPARTMENTS_URL = apiUrl("/api/v1/dashboard/departments/select");
const POSITIONS_URL = apiUrl("/api/v1/dashboard/positions/select");
const PLACEHOLDER = "ค้นหารหัสพนักงาน | ชื่อ | นามสกุล | เบอร์โทร";
const HEADING = "จัดการพนักงานภายใน";

const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ" }), makeDepartment({ id: 2, name: "บัญชี" })];
const POSITIONS = [makePosition({ id: 5, name: "ผู้จัดการ" }), makePosition({ id: 6, name: "เจ้าหน้าที่" })];
const SOMCHAI = makeInternalProfile({ id: 1, employeeNo: "EMP-001", firstname: "สมชาย", lastname: "ใจดี", userId: 42 });
const SOMYING = makeInternalProfile({
  id: 2,
  employeeNo: "EMP-002",
  prefix: "นาง",
  firstname: "สมหญิง",
  lastname: "รักงาน",
  department: DEPARTMENTS[1],
  position: POSITIONS[0],
});

function serveList(profiles: InternalProfile[], meta: Record<string, unknown> = {}) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get(LIST_URL, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(paginated(profiles, meta));
    }),
  );
  return queries;
}

function serveOptions() {
  server.use(
    http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: DEPARTMENTS })),
    http.get(POSITIONS_URL, () => HttpResponse.json({ data: POSITIONS })),
  );
}

async function renderPage(url = "/dashboard/internal-employees") {
  setUrl(url);
  signInAs({ roles: ["admin"] });
  serveOptions();
  const rendered = renderWithQueryClient(<InternalProfilesPage />);
  // รอให้ gate ผ่าน (โหลด /auth/user เสร็จ) ก่อนเช็คเนื้อหาหน้า
  await screen.findByRole("heading", { name: HEADING });
  return { ...rendered, user: userEvent.setup() };
}

// skeleton ตอนโหลดก็มี <table> ด้วย จึงรอให้ filter bar (แสดงหลังโหลดเสร็จ) ขึ้นก่อนค่อยหยิบตารางจริง
async function loadedTable() {
  await screen.findByPlaceholderText(PLACEHOLDER);
  return screen.getByRole("table");
}

const fabButton = () => screen.getByRole("button", { name: "เพิ่มพนักงาน / จัดการแผนกและตำแหน่ง" });

describe("InternalProfilesPage — shell and loading", () => {
  it("shows the heading, description and the skeleton while the list is loading", async () => {
    server.use(http.get(LIST_URL, () => new Promise<never>(() => {})));

    const { container } = await renderPage();

    expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
    expect(screen.getByText("รายชื่อผู้ใช้ทั้งหมดในระบบ ทั้งพนักงานภายในและผู้ค้า")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
  });

  it("sets the breadcrumb", async () => {
    serveList([SOMCHAI]);

    await renderPage();

    expect(useBreadcrumbStore.getState().items).toEqual([{ label: "พนักงานภายใน" }]);
    await screen.findByPlaceholderText(PLACEHOLDER);
  });
});

describe("InternalProfilesPage — populated", () => {
  it("requests the first page of 20 with no filters", async () => {
    const queries = serveList([SOMCHAI]);

    await renderPage();
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(queries).toHaveLength(1);
    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("renders every profile as a table row and as a mobile card", async () => {
    serveList([SOMCHAI, SOMYING], { total: 2 });

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("นายสมชาย ใจดี")).toBeInTheDocument();
    expect(within(table).getByText("นางสมหญิง รักงาน")).toBeInTheDocument();
    expect(within(table).getByText("EMP-002")).toBeInTheDocument();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(within(cards[1]).getByText("นางสมหญิง รักงาน")).toBeInTheDocument();
  });

  it("links profiles that have an account to the user detail page", async () => {
    serveList([SOMCHAI]);

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getByRole("button", { name: "ดูข้อมูล user" })).toHaveAttribute(
      "href",
      "/dashboard/users/detail?id=42",
    );
  });

  it("shows the total from meta in the pagination footer", async () => {
    serveList([SOMCHAI], { total: 45, lastPage: 3 });

    await renderPage();

    expect(await screen.findByText("Found 45 results")).toBeInTheDocument();
  });

  it("offers the department and position names from the select endpoints", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(screen.getAllByRole("combobox").find((c) => c.textContent === "แผนก")!);

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ทุกแผนก", "จัดซื้อ", "บัญชี"]);
  });
});

describe("InternalProfilesPage — URL reaches the request", () => {
  it("sends every parameter from the URL", async () => {
    const queries = serveList([SOMCHAI], { currentPage: 2, perPage: 10, lastPage: 3, total: 25 });

    await renderPage(
      "/dashboard/internal-employees?search=%E0%B8%AA%E0%B8%A1&department=2&position=6&sort_by=lastname&sort_direction=asc&page=2&per_page=10",
    );
    const input = await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({
      search: "สม",
      department_id: "2",
      position_id: "6",
      sort_by: "lastname",
      sort_direction: "asc",
      page: "2",
      per_page: "10",
    });
    expect(input).toHaveValue("สม");
  });

  it("opens a deep link built by routes.dashboards.internal_employees.index(search)", async () => {
    const queries = serveList([SOMCHAI]);

    await renderPage(routes.dashboards.internal_employees.index("สมชาย ใจดี"));
    const input = await screen.findByPlaceholderText(PLACEHOLDER);

    expect(queries.map((q) => Object.fromEntries(q))).toEqual([{ search: "สมชาย ใจดี", page: "1", per_page: "20" }]);
    expect(input).toHaveValue("สมชาย ใจดี");
  });

  it("ignores an unknown sort column and defaults the direction to descending", async () => {
    const queries = serveList([SOMCHAI]);

    await renderPage("/dashboard/internal-employees?sort_by=password");
    await screen.findByPlaceholderText(PLACEHOLDER);
    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("sorts descending by default when only the column is given", async () => {
    const queries = serveList([SOMCHAI]);

    await renderPage("/dashboard/internal-employees?sort_by=department");
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({
      sort_by: "department",
      sort_direction: "desc",
      page: "1",
      per_page: "20",
    });
  });

  it("shows the active filters in the sheet button and in the filter fields", async () => {
    serveList([SOMCHAI]);

    await renderPage("/dashboard/internal-employees?department=2&position=6");

    expect(await screen.findByRole("button", { name: "ตัวกรอง (ใช้อยู่ 2)" })).toBeInTheDocument();
    await waitFor(() => {
      const labels = screen.getAllByRole("combobox").map((c) => c.textContent);
      expect(labels).toContain("บัญชี");
      expect(labels).toContain("เจ้าหน้าที่");
    });
  });
});

describe("InternalProfilesPage — updating the URL", () => {
  it("filters by department and resets the page", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage("/dashboard/internal-employees?page=3");
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(screen.getAllByRole("combobox").find((c) => c.textContent === "แผนก")!);
    await user.click(await screen.findByRole("option", { name: "บัญชี" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/internal-employees?department=2", { scroll: false });
  });

  it("filters by position and keeps other params", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage("/dashboard/internal-employees?department=1");
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(screen.getAllByRole("combobox").find((c) => c.textContent === "ตำแหน่ง")!);
    await user.click(await screen.findByRole("option", { name: "ผู้จัดการ" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/internal-employees?department=1&position=5", { scroll: false });
  });

  it("removes the department param when all departments is chosen", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage("/dashboard/internal-employees?department=2");
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(screen.getAllByRole("combobox").find((c) => c.textContent === "บัญชี")!);
    await user.click(await screen.findByRole("option", { name: "ทุกแผนก" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/internal-employees", { scroll: false });
  });

  it("debounces search typing into the search param", async () => {
    serveList([SOMCHAI]);
    await renderPage("/dashboard/internal-employees?page=2");
    const input = await screen.findByPlaceholderText(PLACEHOLDER);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.change(input, { target: { value: "สม" } });
      act(() => {
        vi.advanceTimersByTime(349);
      });
      expect(router.replace).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(1);
      });
    } finally {
      vi.useRealTimers();
    }

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/internal-employees?search=%E0%B8%AA%E0%B8%A1", { scroll: false });
  });

  it("clears search and both filters together but keeps the sort", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage(
      "/dashboard/internal-employees?search=abc&department=1&position=5&sort_by=firstname&sort_direction=asc&page=2",
    );
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(screen.getByRole("button", { name: "ล้างการค้นหาและตัวกรอง" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/internal-employees?sort_by=firstname&sort_direction=asc", { scroll: false });
  });

  it("sorts from a sortable header", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage();
    const table = await loadedTable();

    await user.click(within(table).getByRole("button", { name: "รหัสพนักงาน" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/internal-employees?sort_by=employee_no&sort_direction=asc", {
      scroll: false,
    });
  });

  it("goes to the next page and keeps the other params", async () => {
    serveList([SOMCHAI], { total: 45, lastPage: 3 });
    const { user } = await renderPage("/dashboard/internal-employees?department=1");
    await loadedTable();

    await user.click(screen.getByRole("button", { name: "Go to next page" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/internal-employees?department=1&page=2", { scroll: false });
  });
});

describe("InternalProfilesPage — table skeleton while refetching", () => {
  it("shows the skeleton instead of stale rows after a filter change, then the new rows", async () => {
    serveList([SOMCHAI]);
    const { container, user, rerender } = await renderPage();
    await loadedTable();

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(LIST_URL, async () => {
        await gate;
        return HttpResponse.json(paginated([SOMYING]));
      }),
    );
    await user.click(screen.getAllByRole("combobox").find((c) => c.textContent === "แผนก")!);
    await user.click(await screen.findByRole("option", { name: "บัญชี" }));
    setUrl("/dashboard/internal-employees?department=2");
    rerender(<InternalProfilesPage />);

    await waitFor(() => expect(screen.queryAllByText("นายสมชาย ใจดี")).toHaveLength(0));
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();

    release();

    expect((await screen.findAllByText("นางสมหญิง รักงาน")).length).toBeGreaterThan(0);
  });
});

describe("InternalProfilesPage — empty and error states", () => {
  it.each([
    ["/dashboard/internal-employees", "ยังไม่มีพนักงานภายในในระบบ"],
    ["/dashboard/internal-employees?department=1", "ไม่พบพนักงานที่ตรงกับเงื่อนไขที่เลือก"],
    ["/dashboard/internal-employees?position=5", "ไม่พบพนักงานที่ตรงกับเงื่อนไขที่เลือก"],
    ["/dashboard/internal-employees?search=xyz", "ไม่พบพนักงานที่ตรงกับคำค้นหา"],
  ])("shows the right empty message for %s", async (url, message) => {
    serveList([]);

    await renderPage(url);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("prefers the search message when both a search and a filter are active", async () => {
    serveList([]);

    await renderPage("/dashboard/internal-employees?search=xyz&department=1");

    expect(await screen.findByText("ไม่พบพนักงานที่ตรงกับคำค้นหา")).toBeInTheDocument();
    expect(screen.queryByText("ไม่พบพนักงานที่ตรงกับเงื่อนไขที่เลือก")).not.toBeInTheDocument();
  });

  it.each([
    ["500", 500],
    ["404", 404],
  ])("shows the error message with the filter bar and no spinner on a %s", async (_name, status) => {
    server.use(http.get(LIST_URL, () => HttpResponse.json({ message: "ผิดพลาด" }, { status })));

    const { container } = await renderPage();

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูลพนักงานได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
  });
});

describe("InternalProfilesPage — add and manage menu", () => {
  it("offers add-employee and a link to manage departments and positions", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(fabButton());

    expect(await screen.findByRole("menuitem", { name: /เพิ่มพนักงาน/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /จัดการแผนกและตำแหน่ง/ })).toHaveAttribute(
      "href",
      "/dashboard/internal-employees/departments-positions",
    );
  });

  it("does not show the create dialog until add-employee is chosen", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage();
    await screen.findByPlaceholderText(PLACEHOLDER);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(fabButton());
    await user.click(await screen.findByRole("menuitem", { name: /เพิ่มพนักงาน/ }));

    expect(await screen.findByRole("dialog", { name: "สร้างพนักงานภายใน" })).toBeInTheDocument();
  });

  it("creates an employee from the dialog and refreshes the list", async () => {
    let profiles = [SOMCHAI];
    const posts: unknown[] = [];
    server.use(
      http.get(LIST_URL, () => HttpResponse.json(paginated(profiles))),
      http.post(LIST_URL, async ({ request }) => {
        posts.push(await request.json());
        profiles = [SOMCHAI, SOMYING];
        return HttpResponse.json({ data: SOMYING }, { status: 201 });
      }),
    );
    const { user } = await renderPage();
    await loadedTable();

    await user.click(fabButton());
    await user.click(await screen.findByRole("menuitem", { name: /เพิ่มพนักงาน/ }));
    const dialog = await screen.findByRole("dialog", { name: "สร้างพนักงานภายใน" });
    // InputField ไม่ได้ผูก <label> กับ input จึงหา input จากข้อความ label ในกลุ่มเดียวกัน
    const textbox = (label: string) => within(screen.getByText(label, { selector: "p" }).closest("div.flex-col") as HTMLElement).getByRole("textbox");
    await user.type(textbox("ชื่อ"), "สมหญิง");
    await user.type(textbox("นามสกุล"), "รักงาน");
    await user.click(within(dialog).getByRole("button", { name: "สร้างพนักงาน" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้างพนักงานสำเร็จ"));
    expect(posts).toEqual([{ firstname: "สมหญิง", lastname: "รักงาน" }]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(3));
  });
});

describe("InternalProfilesPage — permissions", () => {
  it("shows Forbidden, no add/manage menu and no list request to a non-admin", async () => {
    const queries = serveList([]);
    setUrl("/dashboard/internal-employees");
    signInAs({ roles: [], permissions: [] });
    serveOptions();
    renderWithQueryClient(<InternalProfilesPage />);

    await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    expect(screen.queryByRole("button", { name: "เพิ่มพนักงาน / จัดการแผนกและตำแหน่ง" })).not.toBeInTheDocument();
    expect(queries).toHaveLength(0);
  });
});
