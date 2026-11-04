import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "@/components/navbar";
import type { CurrentUser } from "@/lib/auth/types";
import { makeNotification } from "@/tests/fixtures/notifications";
import { paginated } from "@/tests/fixtures/pagination";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const LIST_URL = apiUrl("/api/v1/notifications");
const COUNT_URL = apiUrl("/api/v1/notifications/unread-count");
const READ_ALL_URL = apiUrl("/api/v1/notifications/read-all");
const VENDOR_URL = apiUrl("/api/v1/vendor/profile");

freezeTimeAt("2026-11-02T10:00:00+07:00");

const companyProfiles = { companyName: "บริษัท ทดสอบ จำกัด", shopName: null, firstname: null, lastname: null };

function signInVendor(extra: Partial<CurrentUser> = {}) {
  return signInAs({
    username: "vendor1",
    userType: "company",
    emailVerifiedAt: "2026-01-01T00:00:00Z",
    profiles: companyProfiles,
    ...extra,
  });
}

function completeVendor() {
  return {
    id: 1,
    verificationStatus: "approved",
    detail: { type: "company", companyName: "x", address: "1 ถนน", province: "กรุงเทพ", postalCode: "10110" },
    contact: [{ id: 1, contactName: "a", contactEmail: "a@b.c", contactPhone: "081" }],
    document: [
      "company_certificate",
      "authorized_person_id",
      "vat_registration",
      "shareholder_list",
      "financial_statement",
    ].map((documentType, i) => ({ id: i, documentType })),
  };
}

function mockVendor(profile: unknown = completeVendor()) {
  server.use(http.get(VENDOR_URL, () => HttpResponse.json({ data: profile })));
}

function mockNotifications(count: number, items = [makeNotification({ message: "เอกสารอนุมัติแล้ว" })]) {
  server.use(
    http.get(COUNT_URL, () => HttpResponse.json({ data: { count } })),
    http.get(LIST_URL, () => HttpResponse.json(paginated(items))),
  );
}

describe("Navbar signed out", () => {
  it("shows login and register links, brand and menu links, and no user menu", async () => {
    signOut();
    renderWithQueryClient(<Navbar />);

    const login = await screen.findAllByRole("button", { name: "เข้าสู่ระบบ" });
    expect(login[0]).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("button", { name: "สมัครสมาชิก" })[0]).toHaveAttribute("href", "/register");
    expect(screen.getByText("Lotushall Mining")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "หน้าหลัก" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "เมนูผู้ใช้" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "การแจ้งเตือน" })).not.toBeInTheDocument();
  });

  it("shows loading placeholders instead of auth controls while the user is loading", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise(() => {})));
    const { container } = renderWithQueryClient(<Navbar />);

    expect(screen.queryByRole("button", { name: "เข้าสู่ระบบ" })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("marks the home link as active only on the home path", async () => {
    signOut();
    setUrl("/");
    const { unmount } = renderWithQueryClient(<Navbar />);
    await screen.findAllByRole("button", { name: "เข้าสู่ระบบ" });
    expect(screen.getByRole("link", { name: "หน้าหลัก" })).toHaveClass("text-primary");
    unmount();

    setUrl("/somewhere");
    renderWithQueryClient(<Navbar />);
    await screen.findAllByRole("button", { name: "เข้าสู่ระบบ" });
    expect(screen.getByRole("link", { name: "หน้าหลัก" })).not.toHaveClass("text-primary");
  });
});

describe("Navbar mobile menu", () => {
  // jsdom ไม่รองรับการนำทางจริงเมื่อคลิกลิงก์ — กันไว้เพื่อไม่ให้เกิด "Not implemented: navigation"
  const blockNavigation = (event: Event) => event.preventDefault();
  beforeEach(() => document.addEventListener("click", blockNavigation));
  afterEach(() => document.removeEventListener("click", blockNavigation));

  it("opens the sheet with menu and auth links and closes it when a login link is chosen", async () => {
    signOut();
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);
    await screen.findAllByRole("button", { name: "เข้าสู่ระบบ" });

    await user.click(screen.getByRole("button", { name: "เปิดเมนู" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("เมนู")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "เข้าสู่ระบบ" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the sheet when a nav link inside it is chosen", async () => {
    signOut();
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);
    await screen.findAllByRole("button", { name: "เข้าสู่ระบบ" });

    await user.click(screen.getByRole("button", { name: "เปิดเมนู" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("link", { name: "หน้าหลัก" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows no login controls in the sheet for a signed-in user", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(0, []);
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);
    await screen.findByRole("button", { name: "เมนูผู้ใช้" });

    await user.click(screen.getByRole("button", { name: "เปิดเมนู" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "เข้าสู่ระบบ" })).not.toBeInTheDocument();
  });
});

describe("Navbar profile menu", () => {
  it("shows a vendor their company name, type label and a profile link", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(0, []);
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);

    await user.click(await screen.findByRole("button", { name: "เมนูผู้ใช้" }));

    expect(await screen.findByText("นิติบุคคล")).toBeInTheDocument();
    expect(screen.getAllByText("บริษัท ทดสอบ จำกัด").length).toBeGreaterThan(0);
    expect(screen.getByRole("menuitem", { name: "โปรไฟล์" })).toHaveAttribute("href", "/profiles");
  });

  it("falls back to first and last name when there is no company or shop name", async () => {
    signInVendor({
      userType: "individual",
      profiles: { companyName: null, shopName: null, firstname: "สมชาย", lastname: "ใจดี" },
    });
    mockVendor();
    mockNotifications(0, []);
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);

    await user.click(await screen.findByRole("button", { name: "เมนูผู้ใช้" }));

    expect(await screen.findByText("ร้านค้า")).toBeInTheDocument();
    expect(screen.getAllByText("สมชาย ใจดี").length).toBeGreaterThan(0);
  });

  it("offers an internal user the dashboard link outside the dashboard and home inside it", async () => {
    signInAs({
      userType: "internal",
      username: "officer",
      emailVerifiedAt: "2026-01-01",
      profiles: { companyName: null, shopName: null, firstname: "สมหญิง", lastname: "รักงาน" },
    });
    mockNotifications(0, []);
    mockVendor();
    const user = userEvent.setup();

    setUrl("/");
    const first = renderWithQueryClient(<Navbar />);
    await user.click(await screen.findByRole("button", { name: "เมนูผู้ใช้" }));
    expect(await screen.findByText("พนักงานภายใน")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "แดชบอร์ด" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("menuitem", { name: "โปรไฟล์" })).not.toBeInTheDocument();
    first.unmount();

    setUrl("/dashboard/tors");
    renderWithQueryClient(<Navbar />);
    await user.click(await screen.findByRole("button", { name: "เมนูผู้ใช้" }));
    expect(await screen.findByRole("menuitem", { name: "หน้าหลัก" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("menuitem", { name: "แดชบอร์ด" })).not.toBeInTheDocument();
  });

  it("logs out through the API and sends the user to the home page", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(0, []);
    const logout = vi.fn();
    server.use(
      http.post(apiUrl("/api/v1/auth/logout"), () => {
        logout();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { queryClient } = renderWithQueryClient(<Navbar />);

    await user.click(await screen.findByRole("button", { name: "เมนูผู้ใช้" }));
    await user.click(await screen.findByRole("menuitem", { name: "ออกจากระบบ" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(["auth", "user"])).toBeNull();
  });

  it("does not redirect when logout fails", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(0, []);
    const logout = vi.fn();
    server.use(
      http.post(apiUrl("/api/v1/auth/logout"), () => {
        logout();
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);

    await user.click(await screen.findByRole("button", { name: "เมนูผู้ใช้" }));
    await user.click(await screen.findByRole("menuitem", { name: "ออกจากระบบ" }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("Navbar notification menu", () => {
  it("shows the unread count badge, and 99+ above 99", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(7);
    const first = renderWithQueryClient(<Navbar />);
    const bell = await screen.findByRole("button", { name: "การแจ้งเตือน" });
    await waitFor(() => expect(within(bell).getByText("7")).toBeInTheDocument());
    first.unmount();

    mockNotifications(250);
    renderWithQueryClient(<Navbar />);
    const bell2 = await screen.findByRole("button", { name: "การแจ้งเตือน" });
    await waitFor(() => expect(within(bell2).getByText("99+")).toBeInTheDocument());
  });

  it("shows the empty state when there is nothing to show", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(0, []);
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);

    await user.click(await screen.findByRole("button", { name: "การแจ้งเตือน" }));

    expect(await screen.findByText("ไม่มีการแจ้งเตือนใหม่")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "อ่านทั้งหมด" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "ดูทั้งหมด" })).toHaveAttribute("href", "/notifications");
  });

  it("lists the latest notifications and marks an unread one as read before navigating", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(1, [
      makeNotification({ id: "n-9", message: "เอกสารอนุมัติแล้ว", type: "vendor_document_approved" }),
      makeNotification({ id: "n-8", message: "อ่านแล้ว", readAt: "2026-11-02T08:00:00+07:00" }),
    ]);
    let readUrl = "";
    server.use(
      http.patch(apiUrl("/api/v1/notifications/:id/read"), ({ request }) => {
        readUrl = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);

    await user.click(await screen.findByRole("button", { name: "การแจ้งเตือน" }));
    expect(await screen.findByText("การแจ้งเตือนล่าสุด")).toBeInTheDocument();
    expect(screen.getByText("อ่านแล้ว")).toBeInTheDocument();

    await user.click(screen.getByText("เอกสารอนุมัติแล้ว"));

    await waitFor(() => expect(readUrl).toBe("/api/v1/notifications/n-9/read"));
    expect(router.push).toHaveBeenCalledWith("/profiles/document");
  });

  it("marks all as read through the API", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(3);
    let called = 0;
    server.use(
      http.patch(READ_ALL_URL, () => {
        called += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);
    const bell = await screen.findByRole("button", { name: "การแจ้งเตือน" });
    await waitFor(() => expect(within(bell).getByText("3")).toBeInTheDocument());

    await user.click(bell);
    await user.click(await screen.findByRole("button", { name: "อ่านทั้งหมด" }));

    await waitFor(() => expect(called).toBe(1));
  });

  it("shows the backend message in a toast when mark all read fails", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(3);
    server.use(http.patch(READ_ALL_URL, () => HttpResponse.json({ message: "ล้มเหลว" }, { status: 500 })));
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);
    const bell = await screen.findByRole("button", { name: "การแจ้งเตือน" });
    await waitFor(() => expect(within(bell).getByText("3")).toBeInTheDocument());

    await user.click(bell);
    await user.click(await screen.findByRole("button", { name: "อ่านทั้งหมด" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ล้มเหลว"));
  });

  it("shows the profile completeness checklist when the vendor profile is incomplete", async () => {
    signInVendor({ emailVerifiedAt: null });
    mockVendor({ ...completeVendor(), detail: { type: "company" }, contact: [], document: [] });
    mockNotifications(0, []);
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);

    const bell = await screen.findByRole("button", { name: "การแจ้งเตือน" });
    await waitFor(() => expect(bell.querySelector("span")).toBeInTheDocument());
    await user.click(bell);

    expect(await screen.findByRole("menuitem", { name: /ยืนยันอีเมลของคุณ/ })).toHaveAttribute("href", "/profiles");
    expect(screen.getByRole("menuitem", { name: /กรอกข้อมูลกิจการให้ครบถ้วน/ })).toHaveAttribute(
      "href",
      "/profiles/vendor-info",
    );
    expect(screen.getByRole("menuitem", { name: /เพิ่มข้อมูลผู้ติดต่อให้ครบถ้วน/ })).toHaveAttribute(
      "href",
      "/profiles/contract",
    );
    expect(screen.getByRole("menuitem", { name: /แนบเอกสารประกอบให้ครบถ้วน/ })).toHaveAttribute(
      "href",
      "/profiles/document",
    );
    expect(screen.queryByText("ไม่มีการแจ้งเตือนใหม่")).not.toBeInTheDocument();
  });

  it("omits checklist items for a complete vendor profile", async () => {
    signInVendor();
    mockVendor();
    mockNotifications(0, []);
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);

    await user.click(await screen.findByRole("button", { name: "การแจ้งเตือน" }));

    expect(await screen.findByText("ไม่มีการแจ้งเตือนใหม่")).toBeInTheDocument();
    expect(screen.queryByText("ยืนยันอีเมลของคุณ")).not.toBeInTheDocument();
  });

  it("never shows the vendor checklist to an internal user", async () => {
    signInAs({
      userType: "internal",
      emailVerifiedAt: null,
      profiles: { companyName: null, shopName: null, firstname: "ก", lastname: "ข" },
    });
    mockVendor(null);
    mockNotifications(0, []);
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);

    await user.click(await screen.findByRole("button", { name: "การแจ้งเตือน" }));

    expect(await screen.findByText("ไม่มีการแจ้งเตือนใหม่")).toBeInTheDocument();
    expect(screen.queryByText("ยืนยันอีเมลของคุณ")).not.toBeInTheDocument();
  });

  it("shows both the checklist and the latest notifications together", async () => {
    signInVendor({ emailVerifiedAt: null });
    mockVendor();
    mockNotifications(0, [makeNotification({ message: "ข้อความล่าสุด" })]);
    const user = userEvent.setup();
    renderWithQueryClient(<Navbar />);

    await user.click(await screen.findByRole("button", { name: "การแจ้งเตือน" }));

    expect(await screen.findByText("ข้อความล่าสุด")).toBeInTheDocument();
    expect(screen.getByText("ยืนยันอีเมลของคุณ")).toBeInTheDocument();
  });
});

