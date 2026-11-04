import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DashboardNavbar } from "@/app/dashboard/_components/dashboard-navbar";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { makeNotification } from "@/tests/fixtures/notifications";
import { paginated } from "@/tests/fixtures/pagination";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const COUNT_URL = apiUrl("/api/v1/notifications/unread-count");
const LIST_URL = apiUrl("/api/v1/notifications");

function SidebarState() {
  const { state } = useSidebar();
  return <output aria-label="sidebar state">{state}</output>;
}

function renderNavbar() {
  return renderWithQueryClient(
    <SidebarProvider>
      <DashboardNavbar />
      <SidebarState />
    </SidebarProvider>,
  );
}

function mockNotifications(count: number, items = [makeNotification({ message: "มี TOR ใหม่รออนุมัติ" })]) {
  server.use(
    http.get(COUNT_URL, () => HttpResponse.json({ data: { count } })),
    http.get(LIST_URL, () => HttpResponse.json(paginated(items))),
  );
}

function clearSidebarCookie() {
  document.cookie = "sidebar_state=; path=/; max-age=0";
}

beforeEach(() => {
  setUrl("/dashboard");
  clearSidebarCookie();
});

afterEach(clearSidebarCookie);

const profile = { companyName: null, shopName: null, firstname: "สมหญิง", lastname: "รักงาน" };

describe("DashboardNavbar", () => {
  it("shows the dashboard title in a banner", async () => {
    signInAs({ profiles: profile });
    mockNotifications(0, []);
    renderNavbar();

    const banner = screen.getByRole("banner");
    expect(banner).toHaveTextContent("แดชบอร์ด");
    await screen.findByRole("button", { name: "เมนูผู้ใช้" });
  });

  it("toggles the sidebar from the trigger button", async () => {
    const user = userEvent.setup();
    signInAs({ profiles: profile });
    mockNotifications(0, []);
    renderNavbar();
    await screen.findByRole("button", { name: "เมนูผู้ใช้" });
    expect(screen.getByLabelText("sidebar state")).toHaveTextContent("expanded");

    await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(screen.getByLabelText("sidebar state")).toHaveTextContent("collapsed");

    await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    expect(screen.getByLabelText("sidebar state")).toHaveTextContent("expanded");
  });

  it("shows a placeholder instead of the user menu while the user is loading", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise<never>(() => {})));
    mockNotifications(0, []);
    renderNavbar();

    expect(screen.queryByRole("button", { name: "เมนูผู้ใช้" })).not.toBeInTheDocument();
    expect(screen.getByRole("banner").querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows the signed-in user's menu with their name and role label once loaded", async () => {
    const user = userEvent.setup();
    signInAs({ userType: "internal", username: "officer", profiles: profile });
    mockNotifications(0, []);
    renderNavbar();

    await user.click(await screen.findByRole("button", { name: "เมนูผู้ใช้" }));

    expect(await screen.findByText("พนักงานภายใน")).toBeInTheDocument();
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("สมหญิง รักงาน")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "หน้าหลัก" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("menuitem", { name: "ออกจากระบบ" })).toBeInTheDocument();
  });

  it("shows no user menu when nobody is signed in", async () => {
    signOut();
    mockNotifications(0, []);
    renderNavbar();

    await screen.findByRole("button", { name: "การแจ้งเตือน" });
    expect(screen.queryByRole("button", { name: "เมนูผู้ใช้" })).not.toBeInTheDocument();
  });

  it("shows the notification bell with the unread count badge", async () => {
    signInAs({ profiles: profile });
    mockNotifications(3);
    renderNavbar();

    const bell = await screen.findByRole("button", { name: "การแจ้งเตือน" });
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(bell).toContainElement(screen.getByText("3"));
  });

  it("lists the latest notifications when the bell is opened", async () => {
    const user = userEvent.setup();
    signInAs({ profiles: profile });
    mockNotifications(1, [makeNotification({ message: "มี TOR ใหม่รออนุมัติ" })]);
    renderNavbar();

    await user.click(await screen.findByRole("button", { name: "การแจ้งเตือน" }));

    expect(await screen.findByText("มี TOR ใหม่รออนุมัติ")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "ดูทั้งหมด" })).toHaveAttribute("href", "/notifications");
  });
});
