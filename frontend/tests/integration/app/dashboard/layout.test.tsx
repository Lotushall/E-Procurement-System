import { act, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { beforeEach, describe, expect, it } from "vitest";
import DashboardLayout, { metadata } from "@/app/dashboard/layout";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { paginated } from "@/tests/fixtures/pagination";
import { signInAs, signOut } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

function renderLayout() {
  return renderWithQueryClient(
    <DashboardLayout>
      <p>เนื้อหาหน้า</p>
    </DashboardLayout>,
  );
}

// navbar ของแดชบอร์ดดึงการแจ้งเตือนและ vendor profile (ระหว่างที่ user ยังโหลด) จึงต้องมี handler ครบ
function mockNavbarRequests() {
  server.use(
    http.get(apiUrl("/api/v1/notifications/unread-count"), () => HttpResponse.json({ data: { count: 0 } })),
    http.get(apiUrl("/api/v1/notifications"), () => HttpResponse.json(paginated([]))),
    http.get(apiUrl("/api/v1/vendor/profile"), () => new HttpResponse(null, { status: 404 })),
  );
}

beforeEach(() => {
  setUrl("/dashboard");
  useBreadcrumbStore.setState({ items: [] });
  mockNavbarRequests();
});

describe("dashboard metadata", () => {
  it("titles the section แดชบอร์ด and appends the site name to child page titles", () => {
    expect(metadata.title).toEqual({
      default: "แดชบอร์ด",
      template: "%s | Lotushall Mining E-Bidding",
    });
    expect(metadata.description).toBe("แดชบอร์ดสำหรับผู้ใช้งานภายใน Lotushall Mining");
  });
});

describe("DashboardLayout", () => {
  it("wraps the page in the navbar, the sidebar menu and the breadcrumb for an internal user", async () => {
    signInAs({ userType: "internal", roles: ["admin"], permissions: ["tors.viewAny"] });
    useBreadcrumbStore.setState({ items: [{ label: "TOR-2570-001" }] });

    renderLayout();

    expect(await screen.findByText("เนื้อหาหน้า")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle Sidebar" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Audit Logs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "การจัดการ TOR" })).toHaveAttribute(
      "href",
      "/dashboard/tors",
    );
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument();
    expect(screen.getByText("TOR-2570-001", { selector: '[data-slot="breadcrumb-page"]' })).toBeInTheDocument();
  });

  it("places the page content and the breadcrumb together inside the main area", async () => {
    signInAs({ userType: "internal" });
    useBreadcrumbStore.setState({ items: [{ label: "รายงาน" }] });

    renderLayout();

    const main = await screen.findByRole("main");
    expect(main).toContainElement(screen.getByText("เนื้อหาหน้า"));
    expect(main).toContainElement(screen.getByRole("navigation", { name: "breadcrumb" }));
    expect(screen.getByRole("banner")).not.toContainElement(main);
  });

  it("shows no breadcrumb while the store is empty", async () => {
    signInAs({ userType: "internal" });

    renderLayout();

    await screen.findByText("เนื้อหาหน้า");
    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).not.toBeInTheDocument();
  });

  it("follows the breadcrumb store as pages update it", async () => {
    signInAs({ userType: "internal" });
    renderLayout();
    await screen.findByText("เนื้อหาหน้า");

    act(() => useBreadcrumbStore.getState().setItems([{ label: "ตั้งค่า" }]));

    expect(screen.getByText("ตั้งค่า", { selector: '[data-slot="breadcrumb-page"]' })).toBeInTheDocument();
  });

  it("offers the scroll-to-top button outside the guarded area", async () => {
    signInAs({ userType: "internal" });

    renderLayout();

    await screen.findByText("เนื้อหาหน้า");
    expect(screen.getByRole("button", { name: "Scroll to top" })).toBeInTheDocument();
  });

  it("keeps the scroll-to-top button even when the guard hides the dashboard shell", async () => {
    signOut();

    renderLayout();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("เนื้อหาหน้า")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scroll to top" })).toBeInTheDocument();
  });

  it("hides the whole dashboard shell and redirects a signed-out visitor to /login", async () => {
    signOut();

    renderLayout();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("เนื้อหาหน้า")).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "breadcrumb" })).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("hides the dashboard shell from a vendor and redirects them to their profile", async () => {
    signInAs({ userType: "company" });

    renderLayout();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/profiles"));
    expect(screen.queryByText("เนื้อหาหน้า")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "แดชบอร์ด" })).not.toBeInTheDocument();
  });
});
