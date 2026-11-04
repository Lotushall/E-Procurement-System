import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import VendorListPage from "@/app/dashboard/vendors/page";
import type { CurrentUser } from "@/lib/auth/types";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import type { VendorProfile } from "@/lib/vendor/profile/types";
import { makeVendorListItem } from "@/tests/fixtures/vendor-approval";
import { makeCompanyVendorProfile, makeIndividualVendorProfile } from "@/tests/fixtures/vendor-profile";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/vendors");
const PLACEHOLDER = "ค้นหาชื่อผู้ค้า | ชื่อร้านค้า | หมวดสินค้า/บริการ | เบอร์โทรศัพท์/อีเมล";
const HEADING = "ผู้ค้าที่ลงทะเบียน (Vendor Registration)";

type Meta = Partial<{
  counts: { total: number; pending: number; approved: number; rejected: number };
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}>;

function listBody(vendors: VendorProfile[], meta: Meta = {}) {
  return {
    data: vendors,
    meta: {
      counts: { total: vendors.length, pending: vendors.length, approved: 0, rejected: 0 },
      current_page: 1,
      per_page: 20,
      total: vendors.length,
      last_page: 1,
      ...meta,
    },
  };
}

function serveList(vendors: VendorProfile[], meta: Meta = {}) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get(LIST_URL, ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(listBody(vendors, meta));
    }),
  );
  return queries;
}

const COMPANY = makeCompanyVendorProfile({ id: 1, detail: { companyName: "บริษัท เอ จำกัด" } });
const SHOP = makeIndividualVendorProfile({ id: 2, detail: { storeName: "ร้านบี" } });

// หน้านี้ครอบด้วย RequirePermission(vendors.viewAny) และตัดคอลัมน์ Actions/เมนูลบเมื่อไม่มี vendors.delete
// ค่าเริ่มต้นเห็นครบ — เคสที่ทดสอบการปฏิเสธส่ง permissions ที่จำกัดเอง
const FULL_ACCESS = ["vendors.viewAny", "vendors.delete"];

async function renderPage(url = "/dashboard/vendors", auth: Partial<CurrentUser> = { permissions: FULL_ACCESS }) {
  setUrl(url);
  signInAs(auth);
  const rendered = renderWithQueryClient(<VendorListPage />);
  // รอให้ gate ผ่าน (โหลด /auth/user เสร็จ) ก่อนเช็คเนื้อหาหน้า
  await screen.findByRole("heading", { name: HEADING });
  return { ...rendered, user: userEvent.setup() };
}

// skeleton ตอนโหลดก็มี <table> ด้วย จึงรอให้ filter bar (แสดงหลังโหลดเสร็จ) ขึ้นก่อนค่อยหยิบตารางจริง
async function loadedTable() {
  await screen.findByPlaceholderText(PLACEHOLDER);
  return screen.getByRole("table");
}

// ลำดับการ์ดสถิติ: ทั้งหมด, รอตรวจสอบ, อนุมัติแล้ว, ถูกปฏิเสธ
function statCards(container: HTMLElement) {
  return Array.from(container.querySelector(".md\\:grid-cols-4")!.children) as HTMLElement[];
}

describe("VendorListPage — loading and shell", () => {
  it("shows the heading, the skeleton while loading, and no stats or empty text yet", async () => {
    server.use(http.get(LIST_URL, () => new Promise<never>(() => {})));

    const { container } = await renderPage();

    expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ทั้งหมด/ })).not.toBeInTheDocument();
  });

  it("sets the breadcrumb", async () => {
    serveList([COMPANY]);

    await renderPage();

    expect(useBreadcrumbStore.getState().items).toEqual([{ label: "ผู้ค้าที่ลงทะเบียน" }]);
    await screen.findByPlaceholderText(PLACEHOLDER);
  });
});

describe("VendorListPage — populated", () => {
  it("requests the first page of 20 with no filters", async () => {
    const queries = serveList([COMPANY]);

    await renderPage();
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(queries).toHaveLength(1);
    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("shows stats from meta.counts with the all card active", async () => {
    serveList([COMPANY], { counts: { total: 10, pending: 4, approved: 5, rejected: 1 } });

    const { container } = await renderPage();
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(statCards(container).map((c) => c.textContent)).toEqual([
      "ทั้งหมด10",
      "รอตรวจสอบ4",
      "อนุมัติแล้ว5",
      "ถูกปฏิเสธ1",
    ]);
    expect(statCards(container)[0]).toHaveClass("ring-1");
  });

  it("renders every vendor as a table row and as a mobile card", async () => {
    serveList([COMPANY, SHOP], { total: 2 });

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByRole("link", { name: /บริษัท เอ จำกัด/ })).toHaveAttribute(
      "href",
      "/dashboard/vendors/detail?id=1",
    );
    expect(within(table).getByRole("link", { name: /ร้านบี/ })).toHaveAttribute(
      "href",
      "/dashboard/vendors/detail?id=2",
    );
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByRole("link", { name: /บริษัท เอ จำกัด/ })).toBeInTheDocument();
    expect(within(cards[1]).getByRole("link", { name: /ร้านบี/ })).toBeInTheDocument();
  });

  it("shows the total from meta in the pagination footer", async () => {
    serveList([COMPANY], { total: 45, last_page: 3 });

    await renderPage();

    expect(await screen.findByText("Found 45 results")).toBeInTheDocument();
  });
});

describe("VendorListPage — URL filters reach the request", () => {
  it("sends status, search, sort and paging from the URL", async () => {
    const queries = serveList([COMPANY], { current_page: 2, per_page: 10, last_page: 3, total: 25 });

    await renderPage(
      "/dashboard/vendors?status=pending&search=%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%A9%E0%B8%B1%E0%B8%97&sort_by=name&sort_direction=asc&page=2&per_page=10",
    );
    const input = await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({
      status: "pending",
      search: "บริษัท",
      sort_by: "name",
      sort_direction: "asc",
      page: "2",
      per_page: "10",
    });
    expect(input).toHaveValue("บริษัท");
  });

  it("ignores an unknown status and an unknown sort column", async () => {
    const queries = serveList([COMPANY]);

    await renderPage("/dashboard/vendors?status=bogus&sort_by=password");
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(Object.fromEntries(queries[0])).toEqual({ page: "1", per_page: "20" });
  });

  it("highlights the stat card of the status in the URL", async () => {
    serveList([COMPANY]);

    const { container } = await renderPage("/dashboard/vendors?status=approved");
    await screen.findByPlaceholderText(PLACEHOLDER);

    expect(statCards(container)[2]).toHaveClass("ring-1");
    expect(statCards(container)[0]).not.toHaveClass("ring-1");
  });
});

describe("VendorListPage — updating the URL", () => {
  it("selects a status from a stat card and resets the page", async () => {
    serveList([COMPANY]);
    const { container, user } = await renderPage("/dashboard/vendors?page=3");
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(statCards(container)[1]);

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/vendors?status=pending", { scroll: false });
  });

  it("removes the status when the all card is selected", async () => {
    serveList([COMPANY]);
    const { container, user } = await renderPage("/dashboard/vendors?status=pending");
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(statCards(container)[0]);

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/vendors", { scroll: false });
  });

  it("debounces search typing into the search param", async () => {
    serveList([COMPANY]);
    await renderPage("/dashboard/vendors?page=2");
    const input = await screen.findByPlaceholderText(PLACEHOLDER);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.change(input, { target: { value: "ร้าน" } });
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

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(
      "/dashboard/vendors?search=%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%99",
      { scroll: false },
    );
  });

  it("strips separators from a phone-like search term", async () => {
    serveList([COMPANY]);
    await renderPage();
    const input = await screen.findByPlaceholderText(PLACEHOLDER);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.change(input, { target: { value: "081-234 5678" } });
      act(() => {
        vi.advanceTimersByTime(350);
      });
    } finally {
      vi.useRealTimers();
    }

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/vendors?search=0812345678", { scroll: false });
  });

  it("leaves a name or email search untouched", async () => {
    serveList([COMPANY]);
    await renderPage();
    const input = await screen.findByPlaceholderText(PLACEHOLDER);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      fireEvent.change(input, { target: { value: "a-1@x.co" } });
      act(() => {
        vi.advanceTimersByTime(350);
      });
    } finally {
      vi.useRealTimers();
    }

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/vendors?search=a-1%40x.co", { scroll: false });
  });

  it("clears search and status together from the clear button but keeps the sort", async () => {
    serveList([COMPANY]);
    const { user } = await renderPage("/dashboard/vendors?status=pending&search=abc&sort_by=name&sort_direction=asc&page=2");
    await screen.findByPlaceholderText(PLACEHOLDER);

    await user.click(screen.getByRole("button", { name: "ล้างการค้นหาและตัวกรอง" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(
      "/dashboard/vendors?sort_by=name&sort_direction=asc",
      { scroll: false },
    );
  });

  it("sorts from a sortable header", async () => {
    serveList([COMPANY]);
    const { user } = await renderPage();
    const table = await loadedTable();

    await user.click(within(table).getByRole("button", { name: "วันที่สมัคร" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith(
      "/dashboard/vendors?sort_by=created_at&sort_direction=asc",
      { scroll: false },
    );
  });

  it("goes to the next page and keeps the other params", async () => {
    serveList([COMPANY], { total: 45, last_page: 3 });
    const { user } = await renderPage("/dashboard/vendors?status=approved");
    await loadedTable();

    await user.click(screen.getByRole("button", { name: "Go to next page" }));

    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/dashboard/vendors?status=approved&page=2", {
      scroll: false,
    });
  });
});

describe("VendorListPage — table skeleton while refetching", () => {
  it("shows the table skeleton instead of stale rows after a filter change, then the new rows", async () => {
    serveList([COMPANY]);
    const { container, user, rerender } = await renderPage();
    await loadedTable();

    // เลือกสถานะ (ปิด skipSkeleton) แล้วให้ URL เปลี่ยนตาม แต่ response ยังไม่มา
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(LIST_URL, async () => {
        await gate;
        return HttpResponse.json(listBody([SHOP]));
      }),
    );
    await user.click(statCards(container)[1]);
    setUrl("/dashboard/vendors?status=pending");
    rerender(<VendorListPage />);

    await waitFor(() => expect(screen.queryAllByRole("link", { name: /บริษัท เอ จำกัด/ })).toHaveLength(0));
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();

    release();

    expect((await screen.findAllByRole("link", { name: /ร้านบี/ })).length).toBeGreaterThan(0);
  });
});

describe("VendorListPage — empty and error states", () => {
  it.each([
    ["/dashboard/vendors", "ยังไม่มีผู้ค้าลงทะเบียนในระบบ"],
    ["/dashboard/vendors?status=pending", "ไม่มีผู้ค้าที่รอตรวจสอบ"],
    ["/dashboard/vendors?status=approved", "ไม่มีผู้ค้าที่อนุมัติแล้ว"],
    ["/dashboard/vendors?status=rejected", "ไม่มีผู้ค้าที่ถูกปฏิเสธ"],
  ])("shows the right empty message for %s", async (url, message) => {
    serveList([], { counts: { total: 0, pending: 0, approved: 0, rejected: 0 } });

    await renderPage(url);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the search-specific empty message whenever a search is active, regardless of status", async () => {
    serveList([]);

    await renderPage("/dashboard/vendors?status=approved&search=xyz");

    expect(await screen.findByText("ไม่พบผู้ค้าที่ตรงกับคำค้นหา")).toBeInTheDocument();
    expect(screen.queryByText("ไม่มีผู้ค้าที่อนุมัติแล้ว")).not.toBeInTheDocument();
  });

  it("shows the error message with the filter bar and zeroed stats on a failed request", async () => {
    server.use(http.get(LIST_URL, () => new HttpResponse(null, { status: 500 })));

    const { container } = await renderPage();

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูลผู้ค้าได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument();
    expect(statCards(container).map((c) => c.textContent)).toEqual([
      "ทั้งหมด0",
      "รอตรวจสอบ0",
      "อนุมัติแล้ว0",
      "ถูกปฏิเสธ0",
    ]);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("VendorListPage — mixed content", () => {
  it("renders a generic list item built from the shared fixture", async () => {
    serveList([makeVendorListItem({ id: 9, verificationStatus: "rejected" })]);

    await renderPage();

    const table = await loadedTable();
    expect(within(table).getByText("ถูกปฏิเสธ")).toBeInTheDocument();
  });
});

describe("VendorListPage — permissions", () => {
  it("shows Forbidden and sends no list request without vendors.viewAny", async () => {
    const queries = serveList([COMPANY]);
    setUrl("/dashboard/vendors");
    signInAs({ permissions: ["vendors.delete"] });
    renderWithQueryClient(<VendorListPage />);

    expect(await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(PLACEHOLDER)).not.toBeInTheDocument();
    expect(queries).toHaveLength(0);
  });

  it("shows the delete button in the table and the delete item in the card menu with vendors.delete", async () => {
    serveList([COMPANY]);
    const { user } = await renderPage();

    const table = await loadedTable();
    expect(within(table).getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "ลบผู้ค้า" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("article")).getByRole("button", { name: /^ตัวเลือกของ/ }));
    expect(await screen.findByRole("menuitem", { name: "ลบ" })).toBeInTheDocument();
  });

  it("hides the Actions column and the delete buttons in the table without vendors.delete", async () => {
    serveList([COMPANY, SHOP], { total: 2 });
    await renderPage("/dashboard/vendors", { permissions: ["vendors.viewAny"] });

    const table = await loadedTable();
    expect(within(table).queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: "ลบผู้ค้า" })).not.toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByRole("link", { name: /บริษัท เอ จำกัด/ })).toBeInTheDocument();
  });

  it("offers no delete item in the card menu without vendors.delete", async () => {
    serveList([COMPANY]);
    const { user } = await renderPage("/dashboard/vendors", { permissions: ["vendors.viewAny"] });
    await loadedTable();

    await user.click(within(screen.getByRole("article")).getByRole("button", { name: /^ตัวเลือกของ/ }));

    expect(await screen.findByRole("menuitem", { name: "ดูรายละเอียด" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "ลบ" })).not.toBeInTheDocument();
  });
});
