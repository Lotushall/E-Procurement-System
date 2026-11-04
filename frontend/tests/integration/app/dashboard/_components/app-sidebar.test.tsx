import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppSidebar } from "@/app/dashboard/_components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { CurrentUser } from "@/lib/auth/types";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

// admin ที่มีสิทธิ์ครบทุกเมนู — ต้องเห็นทุกรายการแม้เพิ่ม gate ให้เมนูที่ยังไม่มี gate แล้ว
const EVERYTHING = {
  roles: ["admin"],
  permissions: ["tors.viewAny", "tender_projects.viewAny", "vendors.viewAny", "users.viewAny"],
};

const originalInnerWidth = window.innerWidth;

function renderSidebar(options: { defaultOpen?: boolean } = {}) {
  return renderWithQueryClient(
    <SidebarProvider defaultOpen={options.defaultOpen}>
      <SidebarTrigger />
      <AppSidebar />
    </SidebarProvider>,
  );
}

const link = (name: string) => screen.queryByRole("link", { name });

// ผู้ใช้ภายในที่มีแค่สิทธิ์ดู TOR — ใช้เป็นจุดรอให้ user โหลดเสร็จ (ลิงก์ TOR โผล่) แล้วค่อยเช็คว่าเมนูอื่นไม่โผล่
async function renderAsTorViewerOnly(extra: Partial<CurrentUser> = {}) {
  signInAs({ permissions: ["tors.viewOwn"], ...extra });
  renderSidebar();
  await screen.findByRole("link", { name: "การจัดการ TOR" });
}

function clearSidebarCookie() {
  document.cookie = "sidebar_state=; path=/; max-age=0";
}

beforeEach(() => {
  setUrl("/dashboard");
  clearSidebarCookie();
});

afterEach(() => {
  window.innerWidth = originalInnerWidth;
  clearSidebarCookie();
});

describe("AppSidebar menu items", () => {
  it("shows the dashboard item to every signed-in user and links it to /dashboard", async () => {
    signInAs({ roles: [], permissions: [] });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "แดชบอร์ด" })).toHaveAttribute("href", "/dashboard");
  });

  it.each(["tors.viewAny", "tors.viewDepartment", "tors.viewOwn"])(
    "shows การจัดการ TOR with the %s permission and links it to the TOR list",
    async (permission) => {
      signInAs({ permissions: [permission] });
      renderSidebar();

      expect(await screen.findByRole("link", { name: "การจัดการ TOR" })).toHaveAttribute("href", "/dashboard/tors");
    },
  );

  it("hides การจัดการ TOR from a user whose permissions are not TOR view permissions, even an admin", async () => {
    signInAs({ roles: ["admin"], permissions: ["tors.create", "tors.update"] });
    renderSidebar();

    // รอให้ user โหลดเสร็จ — admin เห็นเมนู Audit Logs
    await screen.findByRole("link", { name: "Audit Logs" });
    expect(link("การจัดการ TOR")).not.toBeInTheDocument();
  });

  it("hides the gated items while the user is still loading, then shows them once loaded", async () => {
    let respond!: () => void;
    const pending = new Promise<void>((resolve) => {
      respond = resolve;
    });
    const user = signInAs({ roles: ["admin"], permissions: ["tors.viewAny"] });
    server.use(
      http.get(apiUrl("/api/v1/auth/user"), async () => {
        await pending;
        return HttpResponse.json({ data: user });
      }),
    );
    renderSidebar();

    expect(screen.getByRole("link", { name: "แดชบอร์ด" })).toBeInTheDocument();
    expect(link("การจัดการ TOR")).not.toBeInTheDocument();
    expect(link("Audit Logs")).not.toBeInTheDocument();

    respond();
    expect(await screen.findByRole("link", { name: "การจัดการ TOR" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit Logs" })).toBeInTheDocument();
  });

  it("shows โครงการจัดซื้อจัดจ้าง to a user holding tender_projects.viewAny and links it to the project list", async () => {
    signInAs({ permissions: ["tender_projects.viewAny"] });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "โครงการจัดซื้อจัดจ้าง" })).toHaveAttribute(
      "href",
      "/dashboard/tender-projects",
    );
  });

  it.skip("BUG: app-sidebar.tsx:49 โครงการจัดซื้อจัดจ้าง has no permissions gate, so it is shown without tender_projects.viewAny although GET /dashboard/tender-projects is can:tender-projects.index (backend/routes/api/v1/dashboard/tender-projects.php:14) — it should be hidden", async () => {
    await renderAsTorViewerOnly();

    expect(link("โครงการจัดซื้อจัดจ้าง")).not.toBeInTheDocument();
  });

  it("shows ผู้ค้าที่ลงทะเบียน to a user holding vendors.viewAny and links it to the vendor list", async () => {
    signInAs({ permissions: ["vendors.viewAny"] });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "ผู้ค้าที่ลงทะเบียน" })).toHaveAttribute(
      "href",
      "/dashboard/vendors",
    );
  });

  it.skip("BUG: app-sidebar.tsx:54 ผู้ค้าที่ลงทะเบียน has no permissions gate, so it is shown without vendors.viewAny although GET /dashboard/vendors is can:vendors.list (backend/routes/api/v1/dashboard/vendors.php:7) — it should be hidden", async () => {
    await renderAsTorViewerOnly();

    expect(link("ผู้ค้าที่ลงทะเบียน")).not.toBeInTheDocument();
  });

  it("shows รายงาน to every signed-in user (the reports page has no backend route yet) and links it to /dashboard/reports", async () => {
    await renderAsTorViewerOnly();

    expect(screen.getByRole("link", { name: "รายงาน" })).toHaveAttribute("href", "/dashboard/reports");
  });

  it("shows Audit Logs to an admin as an external link that opens the API log viewer in a new tab", async () => {
    signInAs({ roles: ["admin"] });
    renderSidebar();

    const auditLogs = await screen.findByRole("link", { name: "Audit Logs" });
    expect(auditLogs).toHaveAttribute("href", "http://localhost:3000/log-viewer");
    expect(auditLogs).toHaveAttribute("target", "_blank");
    expect(auditLogs).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("hides Audit Logs from a user who is not an admin, whatever permissions they hold", async () => {
    await renderAsTorViewerOnly({ roles: ["officer"] });

    expect(link("Audit Logs")).not.toBeInTheDocument();
  });

  it("opens in-app items without a new-tab target", async () => {
    await renderAsTorViewerOnly();

    const tor = screen.getByRole("link", { name: "การจัดการ TOR" });
    expect(tor).not.toHaveAttribute("target");
  });

  it("shows จัดการผู้ใช้ to a user holding users.viewAny and links it to the user list", async () => {
    signInAs({ permissions: ["users.viewAny"] });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "จัดการผู้ใช้" })).toHaveAttribute("href", "/dashboard/users");
  });

  it.skip("BUG: app-sidebar.tsx:71 จัดการผู้ใช้ has no permissions gate, so it is shown without users.viewAny although GET /dashboard/users is can:users.viewAny (backend/routes/api/v1/dashboard/user-management/users.php:11) — it should be hidden", async () => {
    await renderAsTorViewerOnly();

    expect(link("จัดการผู้ใช้")).not.toBeInTheDocument();
  });

  it("shows พนักงานภายใน to an admin and links it to the internal employee list", async () => {
    signInAs({ roles: ["admin"] });
    renderSidebar();

    expect(await screen.findByRole("link", { name: "พนักงานภายใน" })).toHaveAttribute(
      "href",
      "/dashboard/internal-employees",
    );
  });

  it.skip("BUG: app-sidebar.tsx:76 พนักงานภายใน has no role gate, so it is shown to non-admins although every /dashboard/internal-profiles endpoint (except select) is role:admin (backend/routes/api/v1/dashboard/internal-profiles.php:20) — it should be hidden unless the user is an admin", async () => {
    await renderAsTorViewerOnly({ roles: ["officer"] });

    expect(link("พนักงานภายใน")).not.toBeInTheDocument();
  });

  it("shows การตั้งค่า to every signed-in user (the settings page has no backend route yet) and links it to /dashboard/settings", async () => {
    await renderAsTorViewerOnly();

    expect(screen.getByRole("link", { name: "การตั้งค่า" })).toHaveAttribute("href", "/dashboard/settings");
  });

  it("lists the items in menu order for an admin who can see everything", async () => {
    signInAs(EVERYTHING);
    renderSidebar();

    await screen.findByRole("link", { name: "Audit Logs" });
    expect(screen.getAllByRole("link").map((item) => item.textContent)).toEqual([
      "แดชบอร์ด",
      "การจัดการ TOR",
      "โครงการจัดซื้อจัดจ้าง",
      "ผู้ค้าที่ลงทะเบียน",
      "รายงาน",
      "Audit Logs",
      "จัดการผู้ใช้",
      "พนักงานภายใน",
      "การตั้งค่า",
    ]);
  });
});

describe("AppSidebar active item", () => {
  async function renderAt(url: string) {
    setUrl(url);
    signInAs(EVERYTHING);
    renderSidebar();
    await screen.findByRole("link", { name: "Audit Logs" });
  }

  const activeLabels = () =>
    screen
      .getAllByRole("link")
      .filter((item) => item.hasAttribute("data-active"))
      .map((item) => item.textContent);

  it("marks only แดชบอร์ด as active on exactly /dashboard", async () => {
    await renderAt("/dashboard");

    expect(activeLabels()).toEqual(["แดชบอร์ด"]);
  });

  it("does not keep แดชบอร์ด active on a nested dashboard path (exact match only)", async () => {
    await renderAt("/dashboard/tors");

    expect(activeLabels()).toEqual(["การจัดการ TOR"]);
  });

  it.each([
    ["/dashboard/tors/detail", "การจัดการ TOR"],
    ["/dashboard/tender-projects", "โครงการจัดซื้อจัดจ้าง"],
    ["/dashboard/tender-projects/detail", "โครงการจัดซื้อจัดจ้าง"],
    ["/dashboard/vendors", "ผู้ค้าที่ลงทะเบียน"],
    ["/dashboard/vendors/detail", "ผู้ค้าที่ลงทะเบียน"],
    ["/dashboard/reports", "รายงาน"],
    ["/dashboard/users", "จัดการผู้ใช้"],
    ["/dashboard/users/roles-permissions", "จัดการผู้ใช้"],
    ["/dashboard/internal-employees", "พนักงานภายใน"],
    ["/dashboard/internal-employees/departments-positions", "พนักงานภายใน"],
    ["/dashboard/settings", "การตั้งค่า"],
  ])("marks only the matching item as active on %s", async (url, label) => {
    await renderAt(url);

    expect(activeLabels()).toEqual([label]);
  });

  it("marks nothing active on a path outside every menu item", async () => {
    await renderAt("/dashboard/unknown");

    expect(activeLabels()).toEqual([]);
  });

  it("never marks the external Audit Logs link active", async () => {
    await renderAt("/log-viewer");

    expect(screen.getByRole("link", { name: "Audit Logs" })).not.toHaveAttribute("data-active");
  });
});

describe("AppSidebar collapsed state", () => {
  it("is expanded by default", async () => {
    signInAs();
    renderSidebar();

    await screen.findByRole("link", { name: "แดชบอร์ด" });
    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute("data-state", "expanded");
  });

  it("collapses to icons when toggled but keeps every item reachable by its name", async () => {
    const user = userEvent.setup();
    signInAs({ roles: ["admin"] });
    renderSidebar();
    await screen.findByRole("link", { name: "Audit Logs" });

    await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

    await waitFor(() =>
      expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed"),
    );
    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute("data-collapsible", "icon");
    expect(screen.getByRole("link", { name: "แดชบอร์ด" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Audit Logs" })).toBeInTheDocument();
  });

  it("shows the item label as a tooltip on hover when collapsed", async () => {
    const user = userEvent.setup();
    signInAs();
    renderSidebar({ defaultOpen: false });
    const dashboard = await screen.findByRole("link", { name: "แดชบอร์ด" });

    await user.hover(dashboard);

    const tooltip = await screen.findByText("แดชบอร์ด", { selector: '[data-slot="tooltip-content"]' });
    expect(tooltip).not.toHaveAttribute("hidden");
  });

  it("keeps the tooltip hidden on hover while the sidebar is expanded", async () => {
    const user = userEvent.setup();
    signInAs();
    renderSidebar();
    const dashboard = await screen.findByRole("link", { name: "แดชบอร์ด" });

    await user.hover(dashboard);

    const tooltip = await screen.findByText("แดชบอร์ด", { selector: '[data-slot="tooltip-content"]' });
    expect(tooltip).toHaveAttribute("hidden");
  });
});

describe("AppSidebar on mobile", () => {
  // jsdom ไม่รองรับการนำทางจริงเมื่อคลิกลิงก์ — กันไว้เพื่อไม่ให้เกิด "Not implemented: navigation"
  const blockNavigation = (event: Event) => event.preventDefault();
  beforeEach(() => {
    window.innerWidth = 500;
    document.addEventListener("click", blockNavigation);
  });
  afterEach(() => document.removeEventListener("click", blockNavigation));

  it("renders the menu inside a closed sheet that opens from the trigger", async () => {
    const user = userEvent.setup();
    signInAs();
    renderSidebar();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByRole("link", { name: "แดชบอร์ด" })).toHaveAttribute("href", "/dashboard");
  });

  it("closes the sheet after choosing an in-app item", async () => {
    const user = userEvent.setup();
    signInAs();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    const dialog = await screen.findByRole("dialog");

    await user.click(await within(dialog).findByRole("link", { name: "รายงาน" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the sheet after choosing the external Audit Logs item", async () => {
    const user = userEvent.setup();
    signInAs({ roles: ["admin"] });
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
    const dialog = await screen.findByRole("dialog");

    await user.click(await within(dialog).findByRole("link", { name: "Audit Logs" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("AppSidebar on desktop", () => {
  const blockNavigation = (event: Event) => event.preventDefault();
  beforeEach(() => document.addEventListener("click", blockNavigation));
  afterEach(() => document.removeEventListener("click", blockNavigation));

  it("keeps the sidebar open after choosing an item", async () => {
    const user = userEvent.setup();
    signInAs();
    renderSidebar();

    await user.click(await screen.findByRole("link", { name: "รายงาน" }));

    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute("data-state", "expanded");
  });
});
