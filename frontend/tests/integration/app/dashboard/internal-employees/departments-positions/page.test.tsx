import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import DepartmentsPositions from "@/app/dashboard/internal-employees/departments-positions/page";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { routes } from "@/lib/routes";
import type { Department, Position } from "@/lib/internal-profiles/types";
import { makeDepartment, makePosition } from "@/tests/fixtures/internal-profiles";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const DEPARTMENTS_URL = apiUrl("/api/v1/dashboard/departments");
const POSITIONS_URL = apiUrl("/api/v1/dashboard/positions");
const FORBIDDEN = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้";
const HEADING = "จัดการแผนก และตำแหน่ง";

function serveLists(departments: Department[] = [], positions: Position[] = []) {
  const calls = { departments: 0, positions: 0 };
  server.use(
    http.get(DEPARTMENTS_URL, () => {
      calls.departments += 1;
      return HttpResponse.json({ data: departments });
    }),
    http.get(POSITIONS_URL, () => {
      calls.positions += 1;
      return HttpResponse.json({ data: positions });
    }),
  );
  return calls;
}

function renderPage() {
  const rendered = renderWithQueryClient(<DepartmentsPositions />);
  return { ...rendered, user: userEvent.setup() };
}

const departmentTab = () => screen.getByRole("tab", { name: "แผนก" });
const positionTab = () => screen.getByRole("tab", { name: "ตำแหน่ง" });

describe("DepartmentsPositions — admin gate", () => {
  it("shows a spinner and nothing else while the user is loading", () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new Promise(() => {})));
    const calls = serveLists();

    renderPage();

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    expect(screen.queryByText(FORBIDDEN)).not.toBeInTheDocument();
    expect(calls).toEqual({ departments: 0, positions: 0 });
  });

  it("blocks a signed-in user who is not an admin and makes no list request", async () => {
    signInAs({ roles: ["officer"], permissions: ["tors.viewAny"] });
    const calls = serveLists();

    renderPage();

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: HEADING })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เพิ่มแผนก" })).not.toBeInTheDocument();
    expect(calls).toEqual({ departments: 0, positions: 0 });
  });

  it("blocks a user with no roles", async () => {
    signInAs({ roles: [], permissions: [] });
    serveLists();

    renderPage();

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
  });

  it("blocks a signed-out visitor", async () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new HttpResponse(null, { status: 401 })));
    const calls = serveLists();

    renderPage();

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    expect(calls).toEqual({ departments: 0, positions: 0 });
  });

  it("shows the page to an admin", async () => {
    signInAs({ roles: ["admin"] });
    serveLists([makeDepartment({ id: 1, name: "จัดซื้อ" })]);

    renderPage();

    expect(await screen.findByRole("heading", { name: HEADING })).toBeInTheDocument();
    expect(screen.getByText("จัดการข้อมูลแผนกและตำแหน่งงานทั้งหมดที่ใช้ในระบบพนักงานภายใน")).toBeInTheDocument();
    expect(screen.queryByText(FORBIDDEN)).not.toBeInTheDocument();
    expect(await screen.findByText("จัดซื้อ")).toBeInTheDocument();
  });
});

describe("DepartmentsPositions — breadcrumb", () => {
  it("links back to the internal employees list", async () => {
    signInAs({ roles: ["admin"] });
    serveLists();

    renderPage();
    await screen.findByRole("heading", { name: HEADING });

    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "พนักงานภายใน", href: routes.dashboards.internal_employees.index() },
      { label: "จัดการแผนก และตำแหน่ง" },
    ]);
  });
});

describe("DepartmentsPositions — tabs", () => {
  async function renderAdmin(departments: Department[], positions: Position[]) {
    signInAs({ roles: ["admin"] });
    const calls = serveLists(departments, positions);
    const rendered = renderPage();
    await screen.findByRole("heading", { name: HEADING });
    return { ...rendered, calls };
  }

  const DEPARTMENTS = [makeDepartment({ id: 1, name: "จัดซื้อ", internalProfilesCount: 4 })];
  const POSITIONS = [makePosition({ id: 5, name: "ผู้จัดการ", internalProfilesCount: 2 })];

  it("starts on the department tab with its list and add button", async () => {
    const { calls } = await renderAdmin(DEPARTMENTS, POSITIONS);

    expect(departmentTab()).toHaveAttribute("aria-selected", "true");
    expect(positionTab()).toHaveAttribute("aria-selected", "false");
    expect(await screen.findByText("จัดซื้อ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เพิ่มแผนก" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เพิ่มตำแหน่ง" })).not.toBeInTheDocument();
    expect(screen.queryByText("ผู้จัดการ")).not.toBeInTheDocument();
    expect(calls.positions).toBe(0);
  });

  it("switches to positions: list, search box and add button follow the tab", async () => {
    const { user } = await renderAdmin(DEPARTMENTS, POSITIONS);
    await screen.findByText("จัดซื้อ");

    await user.click(positionTab());

    expect(await screen.findByText("ผู้จัดการ")).toBeInTheDocument();
    expect(positionTab()).toHaveAttribute("aria-selected", "true");
    expect(departmentTab()).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("button", { name: "เพิ่มตำแหน่ง" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เพิ่มแผนก" })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("ค้นหาตำแหน่ง")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("ค้นหาแผนก")).not.toBeInTheDocument();
    expect(screen.queryByText("จัดซื้อ")).not.toBeInTheDocument();
  });

  it("switches back to departments", async () => {
    const { user } = await renderAdmin(DEPARTMENTS, POSITIONS);
    await user.click(positionTab());
    await screen.findByText("ผู้จัดการ");

    await user.click(departmentTab());

    expect(await screen.findByText("จัดซื้อ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เพิ่มแผนก" })).toBeInTheDocument();
    expect(screen.queryByText("ผู้จัดการ")).not.toBeInTheDocument();
  });

  it("switches tabs from the keyboard", async () => {
    const { user } = await renderAdmin(DEPARTMENTS, POSITIONS);
    await screen.findByText("จัดซื้อ");

    departmentTab().focus();
    await user.keyboard("{ArrowRight}{Enter}");

    expect(await screen.findByText("ผู้จัดการ")).toBeInTheDocument();
    expect(positionTab()).toHaveAttribute("aria-selected", "true");
  });

  it("reaches each tab's empty state independently", async () => {
    const { user } = await renderAdmin([], []);
    expect(await screen.findByText("ยังไม่มีแผนกในระบบ")).toBeInTheDocument();

    await user.click(positionTab());

    expect(await screen.findByText("ยังไม่มีตำแหน่งในระบบ")).toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีแผนกในระบบ")).not.toBeInTheDocument();
  });

  it("shows the error text only on the tab whose list failed", async () => {
    signInAs({ roles: ["admin"] });
    server.use(
      http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: [makeDepartment({ id: 1, name: "จัดซื้อ" })] })),
      http.get(POSITIONS_URL, () => new HttpResponse(null, { status: 500 })),
    );
    const { user } = renderPage();
    expect(await screen.findByText("จัดซื้อ")).toBeInTheDocument();

    await user.click(positionTab());

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูลตำแหน่งได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
  });
});

describe("DepartmentsPositions — end to end wiring", () => {
  it("creates a department from the header button and lists it", async () => {
    signInAs({ roles: ["admin"] });
    const departments: Department[] = [makeDepartment({ id: 1, name: "จัดซื้อ" })];
    const bodies: unknown[] = [];
    server.use(
      http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: departments })),
      http.post(DEPARTMENTS_URL, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        bodies.push(body);
        const created = makeDepartment({ id: 2, name: body.name });
        departments.push(created);
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );
    const { user } = renderPage();
    await screen.findByText("จัดซื้อ");

    await user.click(screen.getByRole("button", { name: "เพิ่มแผนก" }));
    const dialog = await screen.findByRole("dialog", { name: "สร้างแผนก" });
    await user.type(within(dialog).getByRole("textbox"), "การเงิน");
    await user.click(within(dialog).getByRole("button", { name: "สร้างแผนก" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้างแผนกสำเร็จ"));
    expect(bodies).toEqual([{ name: "การเงิน" }]);
    expect(await screen.findByText("การเงิน")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("creates a position from the header button on the position tab and lists it", async () => {
    signInAs({ roles: ["admin"] });
    const positions: Position[] = [makePosition({ id: 5, name: "ผู้จัดการ" })];
    const bodies: unknown[] = [];
    server.use(
      http.get(DEPARTMENTS_URL, () => HttpResponse.json({ data: [] })),
      http.get(POSITIONS_URL, () => HttpResponse.json({ data: positions })),
      http.post(POSITIONS_URL, async ({ request }) => {
        const body = (await request.json()) as { name: string };
        bodies.push(body);
        const created = makePosition({ id: 6, name: body.name });
        positions.push(created);
        return HttpResponse.json({ data: created }, { status: 201 });
      }),
    );
    const { user } = renderPage();
    await user.click(await screen.findByRole("tab", { name: "ตำแหน่ง" }));
    await screen.findByText("ผู้จัดการ");

    await user.click(screen.getByRole("button", { name: "เพิ่มตำแหน่ง" }));
    const dialog = await screen.findByRole("dialog", { name: "สร้างตำแหน่ง" });
    await user.type(within(dialog).getByRole("textbox"), "วิศวกร");
    await user.click(within(dialog).getByRole("button", { name: "สร้างตำแหน่ง" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("สร้างตำแหน่งสำเร็จ"));
    expect(bodies).toEqual([{ name: "วิศวกร" }]);
    expect(await screen.findByText("วิศวกร")).toBeInTheDocument();
  });
});
