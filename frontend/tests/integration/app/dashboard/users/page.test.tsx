import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import UsersPage from "@/app/dashboard/users/page";
import type { CurrentUser } from "@/lib/auth/types";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import type { UserListItem } from "@/lib/user/management/types";
import { paginated } from "@/tests/fixtures/pagination";
import { makeManagedUser } from "@/tests/fixtures/user-management";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/dashboard/users");
const PLACEHOLDER = "ค้นหาชื่อ | username | อีเมล";
const HEADING = "จัดการผู้ใช้";
const BASE = "/dashboard/users";

const SOMCHAI = makeManagedUser({ id: 1, username: "somchai", name: "สมชาย ใจดี", email: "somchai@example.com" });
const ACME = makeManagedUser({
  id: 2,
  username: "acme",
  name: "บริษัท เอซีเอ็มอี จำกัด",
  email: "acme@example.com",
  userType: "company",
  status: "pending",
});

function serveList(users: UserListItem[], meta: Record<string, unknown> = {}) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get(LIST_URL, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(paginated(users, meta));
    }),
  );
  return queries;
}

// หน้านี้ครอบด้วย RequirePermission(users.viewAny) — ผู้ใช้ที่เรียกผ่านฟังก์ชันนี้มี viewAny เสมอ (บวกสิทธิ์ที่ส่งมา)
// เคสที่ทดสอบการปฏิเสธต้อง signInAs เองโดยไม่มี viewAny
async function renderPage(url = BASE, auth: Partial<CurrentUser> = { id: 1000 }) {
  setUrl(url);
  signInAs({ ...auth, permissions: ["users.viewAny", ...(auth.permissions ?? [])] });
  const rendered = renderWithQueryClient(<UsersPage />);
  // รอให้ gate ผ่าน (โหลด /auth/user เสร็จ) ก่อนเช็คเนื้อหาหน้า
  await screen.findByRole("heading", { name: HEADING });
  return { ...rendered, user: userEvent.setup() };
}

// skeleton ตอนโหลดก็มี <table> ด้วย จึงรอให้ filter bar (แสดงหลังโหลดเสร็จ) ขึ้นก่อนค่อยหยิบตารางจริง
async function loadedTable() {
  await screen.findByPlaceholderText(PLACEHOLDER);
  return screen.getByRole("table");
}

// รอให้ทั้งรายการและ /auth/user โหลดเสร็จ — ปุ่มที่ขึ้นกับสิทธิ์จะได้นิ่ง
async function settled(queryClient: { isFetching: () => number }) {
  await screen.findByPlaceholderText(PLACEHOLDER);
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
}

const labelOf = (c: HTMLElement) => (c.textContent ?? "").replace("▼", "");
const comboWithText = (text: string) => screen.getAllByRole("combobox").find((c) => labelOf(c) === text)!;

describe("UsersPage — shell and loading", () => {
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

    expect(useBreadcrumbStore.getState().items).toEqual([{ label: HEADING }]);
    await screen.findByPlaceholderText(PLACEHOLDER);
  });
});

describe("UsersPage — populated", () => {
  it("requests the first page of 20 with no filters", async () => {
    const queries = serveList([SOMCHAI]);

    await renderPage();
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(queries).toHaveLength(1);
    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("renders every user as a table row and as a mobile card", async () => {
    serveList([SOMCHAI, ACME], { total: 2 });

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("somchai")).toBeInTheDocument();
    expect(within(table).getByText("บริษัท เอซีเอ็มอี จำกัด")).toBeInTheDocument();
    expect(within(table).getByText("acme@example.com")).toBeInTheDocument();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(within(cards[1]).getByText("นิติบุคคล")).toBeInTheDocument();
  });

  it("links each user to the detail page", async () => {
    serveList([SOMCHAI]);

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getByRole("link", { name: /somchai/ })).toHaveAttribute("href", "/dashboard/users/detail?id=1");
  });

  it("shows the total from meta in the pagination footer", async () => {
    serveList([SOMCHAI], { total: 45, lastPage: 3 });

    await renderPage();

    expect(await screen.findByText("Found 45 results")).toBeInTheDocument();
  });
});

describe("UsersPage — URL reaches the request", () => {
  it("sends every parameter from the URL", async () => {
    const queries = serveList([SOMCHAI], { currentPage: 2, perPage: 10, lastPage: 3, total: 25 });

    await renderPage(`${BASE}?search=%E0%B8%AA%E0%B8%A1&type=company&status=pending&sort_by=email&sort_direction=asc&page=2&per_page=10`);
    const input = await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({
      search: "สม",
      type: "company",
      status: "pending",
      sort_by: "email",
      sort_direction: "asc",
      page: "2",
      per_page: "10",
    });
    expect(input).toHaveValue("สม");
  });

  it("ignores an unknown type and status", async () => {
    const queries = serveList([SOMCHAI]);

    await renderPage(`${BASE}?type=robot&status=banned`);
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
    expect(comboWithText("ทุกประเภท")).toBeInTheDocument();
    expect(comboWithText("ทุกสถานะ")).toBeInTheDocument();
  });

  it("treats type=all and status=all as no filter", async () => {
    const queries = serveList([SOMCHAI]);

    await renderPage(`${BASE}?type=all&status=all`);
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("ignores an unknown sort column", async () => {
    const queries = serveList([SOMCHAI]);

    await renderPage(`${BASE}?sort_by=password`);
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("sorts descending by default when only the column is given", async () => {
    const queries = serveList([SOMCHAI]);

    await renderPage(`${BASE}?sort_by=username`);
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({ sort_by: "username", sort_direction: "desc", page: "1", per_page: "20" });
  });

  it("shows the active filters in the sheet button and in the filter fields", async () => {
    serveList([SOMCHAI]);

    await renderPage(`${BASE}?type=company&status=suspended`);

    expect(await screen.findByRole("button", { name: "ตัวกรอง (ใช้อยู่ 2)" })).toBeInTheDocument();
    expect(comboWithText("นิติบุคคล")).toBeInTheDocument();
    expect(comboWithText("ระงับการใช้งาน")).toBeInTheDocument();
  });

  it("does not count the search as an active filter", async () => {
    serveList([SOMCHAI]);

    await renderPage(`${BASE}?search=abc`);

    expect(await screen.findByRole("button", { name: "ตัวกรอง" })).toBeInTheDocument();
  });
});

describe("UsersPage — updating the URL", () => {
  it("filters by type and resets the page", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage(`${BASE}?page=3`);
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(comboWithText("ทุกประเภท"));
    await user.click(await screen.findByRole("option", { name: "นิติบุคคล" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?type=company`, { scroll: false });
  });

  it("filters by status and keeps the type", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage(`${BASE}?type=internal`);
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(comboWithText("ทุกสถานะ"));
    await user.click(await screen.findByRole("option", { name: "ใช้งานอยู่" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?type=internal&status=active`, { scroll: false });
  });

  it("removes the type param when all types is chosen", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage(`${BASE}?type=company`);
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(comboWithText("นิติบุคคล"));
    await user.click(await screen.findByRole("option", { name: "ทุกประเภท" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(BASE, { scroll: false });
  });

  it("removes the status param when all statuses is chosen", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage(`${BASE}?status=pending`);
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(comboWithText("รอตรวจสอบ"));
    await user.click(await screen.findByRole("option", { name: "ทุกสถานะ" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(BASE, { scroll: false });
  });

  it("debounces search typing into the search param", async () => {
    serveList([SOMCHAI]);
    await renderPage(`${BASE}?page=2`);
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

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?search=%E0%B8%AA%E0%B8%A1`, { scroll: false });
  });

  it("clears search, type and status together but keeps the sort", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage(`${BASE}?search=abc&type=company&status=pending&sort_by=email&sort_direction=asc&page=2`);
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(screen.getByRole("button", { name: "ล้างการค้นหาและตัวกรอง" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=email&sort_direction=asc`, { scroll: false });
  });

  it.each([
    ["ผู้ใช้", "username"],
    ["อีเมล", "email"],
    ["วันที่สร้าง", "created_at"],
  ])("sorts by %s from the table header", async (label, id) => {
    serveList([SOMCHAI]);
    const { user } = await renderPage();
    const table = await loadedTable();

    await user.click(within(table).getByRole("button", { name: label }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=${id}&sort_direction=asc`, { scroll: false });
  });

  it("sorts from the sort select", async () => {
    serveList([SOMCHAI]);
    const { user } = await renderPage();
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(screen.getByRole("combobox", { name: "เรียงตาม" }));
    await user.click(await screen.findByRole("option", { name: "วันที่สร้าง ใหม่ → เก่า" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?sort_by=created_at&sort_direction=desc`, { scroll: false });
  });

  it("goes to the next page and keeps the other params", async () => {
    serveList([SOMCHAI], { total: 45, lastPage: 3 });
    const { user } = await renderPage(`${BASE}?type=internal`);
    await loadedTable();

    await user.click(screen.getByRole("button", { name: "Go to next page" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(`${BASE}?type=internal&page=2`, { scroll: false });
  });
});

describe("UsersPage — table skeleton while refetching", () => {
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
        return HttpResponse.json(paginated([ACME]));
      }),
    );
    await user.click(comboWithText("ทุกประเภท"));
    await user.click(await screen.findByRole("option", { name: "นิติบุคคล" }));
    setUrl(`${BASE}?type=company`);
    rerender(<UsersPage />);

    await waitFor(() => expect(screen.queryAllByText("somchai")).toHaveLength(0));
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();

    release();

    expect((await screen.findAllByText("acme")).length).toBeGreaterThan(0);
  });
});

describe("UsersPage — empty and error states", () => {
  it.each([
    [BASE, "ยังไม่มีผู้ใช้ในระบบ"],
    [`${BASE}?type=company`, "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไขที่เลือก"],
    [`${BASE}?status=pending`, "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไขที่เลือก"],
    [`${BASE}?search=xyz`, "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา"],
    [`${BASE}?search=xyz&type=company`, "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา"],
  ])("shows the right empty message for %s", async (url, message) => {
    serveList([]);

    await renderPage(url);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("does not show the other empty messages", async () => {
    serveList([]);

    await renderPage(`${BASE}?search=xyz&type=company`);

    await screen.findByText("ไม่พบผู้ใช้ที่ตรงกับคำค้นหา");
    expect(screen.queryByText("ไม่พบผู้ใช้ที่ตรงกับเงื่อนไขที่เลือก")).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีผู้ใช้ในระบบ")).not.toBeInTheDocument();
  });

  it.each([
    ["500", 500],
    ["404", 404],
    ["403", 403],
  ])("shows the error message with the filter bar and no spinner on a %s", async (_name, status) => {
    server.use(http.get(LIST_URL, () => HttpResponse.json({ message: "ผิดพลาด" }, { status })));

    const { container } = await renderPage();

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
  });
});

describe("UsersPage — floating action button", () => {
  const CREATE_LABEL = "เพิ่ม user";
  const ROLES_LABEL = "จัดการ Role และ Permission";
  const MENU_LABEL = "เพิ่ม user / จัดการ Role และ Permission";

  it("links straight to create when only users.create is held", async () => {
    serveList([SOMCHAI]);
    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["users.create"] });
    await settled(queryClient);

    expect(await screen.findByRole("button", { name: CREATE_LABEL })).toHaveAttribute("href", "/dashboard/users/create");
    expect(screen.queryByRole("button", { name: MENU_LABEL })).not.toBeInTheDocument();
  });

  it("links straight to role management for an admin without users.create", async () => {
    serveList([SOMCHAI]);
    const { queryClient } = await renderPage(BASE, { id: 1000, roles: ["admin"] });
    await settled(queryClient);

    expect(await screen.findByRole("button", { name: ROLES_LABEL })).toHaveAttribute("href", "/dashboard/users/roles-permissions");
  });

  it("offers a menu with both actions to an admin who can create users", async () => {
    serveList([SOMCHAI]);
    const { user, queryClient } = await renderPage(BASE, { id: 1000, roles: ["admin"], permissions: ["users.create"] });
    await settled(queryClient);

    await user.click(await screen.findByRole("button", { name: MENU_LABEL }));

    expect(await screen.findByRole("menuitem", { name: new RegExp(CREATE_LABEL) })).toHaveAttribute("href", "/dashboard/users/create");
    expect(screen.getByRole("menuitem", { name: new RegExp(ROLES_LABEL) })).toHaveAttribute("href", "/dashboard/users/roles-permissions");
  });

  it("shows no floating button without users.create or the admin role", async () => {
    serveList([SOMCHAI]);
    const { queryClient } = await renderPage(BASE, { id: 1000, roles: ["officer"], permissions: ["users.update"] });
    await settled(queryClient);

    expect(screen.queryByRole("button", { name: CREATE_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ROLES_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: MENU_LABEL })).not.toBeInTheDocument();
  });
});

describe("UsersPage — actions by permission", () => {
  it("shows read-only badges and no row actions without any action permission", async () => {
    serveList([SOMCHAI]);
    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["users.viewAny"] });
    await settled(queryClient);

    const table = screen.getByRole("table");
    expect(within(table).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(table).getByText("ใช้งานอยู่")).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: "แก้ไข user" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: "ลบ user" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ตัวเลือกของ somchai" })).not.toBeInTheDocument();
  });

  it("shows an editable status select with users.updateStatus and patches the user", async () => {
    const calls: { id: unknown; body: unknown }[] = [];
    serveList([SOMCHAI]);
    server.use(
      http.patch(apiUrl("/api/v1/dashboard/users/:id/status"), async ({ params, request }) => {
        calls.push({ id: params.id, body: await request.json() });
        return HttpResponse.json({ data: { status: "suspended" } });
      }),
    );
    const { user, queryClient } = await renderPage(BASE, { id: 1000, permissions: ["users.updateStatus"] });
    await settled(queryClient);

    const table = screen.getByRole("table");
    await user.click(await within(table).findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "ระงับการใช้งาน" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เปลี่ยนสถานะสำเร็จ"));
    expect(calls).toEqual([{ id: "1", body: { status: "suspended" } }]);
  });

  it("refetches the list after a status change", async () => {
    let status: UserListItem["status"] = "active";
    const queries: URLSearchParams[] = [];
    server.use(
      http.get(LIST_URL, ({ request }) => {
        queries.push(new URL(request.url).searchParams);
        return HttpResponse.json(paginated([{ ...SOMCHAI, status }]));
      }),
      http.patch(apiUrl("/api/v1/dashboard/users/:id/status"), () => {
        status = "suspended";
        return HttpResponse.json({ data: { status } });
      }),
    );
    const { user, queryClient } = await renderPage(BASE, { id: 1000, permissions: ["users.updateStatus"] });
    await settled(queryClient);

    await user.click(await within(screen.getByRole("table")).findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "ระงับการใช้งาน" }));

    await waitFor(() => expect(queries.length).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(within(screen.getByRole("table")).getByRole("combobox")).toHaveTextContent("ระงับการใช้งาน"));
  });

  it("links to edit with users.update", async () => {
    serveList([SOMCHAI]);
    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["users.update"] });
    await settled(queryClient);

    const table = screen.getByRole("table");
    expect(await within(table).findByRole("button", { name: "แก้ไข user" })).toHaveAttribute("href", "/dashboard/users/edit?id=1");
    expect(within(table).queryByRole("button", { name: "ลบ user" })).not.toBeInTheDocument();
  });

  it("deletes a user with users.delete and refreshes the list", async () => {
    let users = [SOMCHAI, ACME];
    const ids: unknown[] = [];
    server.use(
      http.get(LIST_URL, () => HttpResponse.json(paginated(users))),
      http.delete(apiUrl("/api/v1/dashboard/users/:id"), ({ params }) => {
        ids.push(params.id);
        users = [SOMCHAI];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, queryClient } = await renderPage(BASE, { id: 1000, permissions: ["users.delete"] });
    await settled(queryClient);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(3);

    await user.click((await within(table).findAllByRole("button", { name: "ลบ user" }))[1]);
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent('"acme"');
    await user.click(within(dialog).getByRole("button", { name: "ลบผู้ใช้" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ใช้สำเร็จ"));
    expect(ids).toEqual(["2"]);
    await waitFor(() => expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("disables deleting the signed-in user's own row", async () => {
    serveList([makeManagedUser({ id: 1000, username: "me" }), ACME]);
    const { queryClient } = await renderPage(BASE, { id: 1000, permissions: ["users.delete"] });
    await settled(queryClient);

    const table = screen.getByRole("table");
    await waitFor(() => {
      const buttons = within(table).getAllByRole("button", { name: "ลบ user" });
      expect(buttons[0]).toBeDisabled();
      expect(buttons[1]).toBeEnabled();
    });
  });

  it("offers edit and delete in the mobile card menu", async () => {
    serveList([SOMCHAI]);
    const { user, queryClient } = await renderPage(BASE, { id: 1000, permissions: ["users.update", "users.delete"] });
    await settled(queryClient);

    await user.click(await screen.findByRole("button", { name: "ตัวเลือกของ somchai" }));

    expect(await screen.findByRole("menuitem", { name: "แก้ไข" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "ลบ" })).toBeInTheDocument();
  });
});

describe("UsersPage — permissions", () => {
  it("shows Forbidden and sends no list request without users.viewAny", async () => {
    const queries = serveList([SOMCHAI]);
    setUrl(BASE);
    signInAs({ id: 1000, roles: [], permissions: [] });
    renderWithQueryClient(<UsersPage />);

    expect(await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
    expect(queries).toHaveLength(0);
  });
});
