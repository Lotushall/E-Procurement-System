import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import TenderProjectDetailPage from "@/app/dashboard/tender-projects/detail/page";
import type { CurrentUser } from "@/lib/auth/types";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { LOAD_ERROR_MESSAGE } from "@/lib/detail-page";
import { routes } from "@/lib/routes";
import type { TenderProjects } from "@/lib/tender/tender-projects/types";
import { makeInternalProfile } from "@/tests/fixtures/internal-profiles";
import { makeTenderProject } from "@/tests/fixtures/tender-projects";
import { makeTor } from "@/tests/fixtures/tors";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";
import { toast } from "sonner";

const DETAIL_URL = apiUrl("/api/v1/dashboard/tender-projects/:id");
const STATUS_URL = apiUrl("/api/v1/dashboard/tender-projects/:id/status");
const NOT_FOUND = "ไม่พบข้อมูลโครงการนี้";
const FULL_ACCESS = ["tender_projects.viewAny", "tender_projects.updateStatus", "tors.viewAny"];

freezeTimeAt("2026-11-02T10:00:00+07:00");

const TOR_A = makeTor({ id: 21, torCode: "TOR-2026-001", title: "จัดซื้อโน้ตบุ๊ก", status: "draft" });
const TOR_B = makeTor({ id: 22, torCode: "TOR-2026-002", title: "จัดซื้อเครื่องพิมพ์", status: "approved" });

const PROJECT = makeTenderProject({
  id: 7,
  projectCode: "TP-2026-007",
  name: "จัดซื้อครุภัณฑ์คอมพิวเตอร์",
  description: "จัดซื้อคอมพิวเตอร์สำหรับสำนักงาน",
  budget: "1000000.00",
  allocatedBudget: "250000.00",
  department: { id: 3, name: "สำนักงานเลขา" },
  personInCharge: makeInternalProfile({ firstname: "สมหญิง", lastname: "รักงาน" }),
  projectStartAt: "2026-01-05T00:00:00.000000Z",
  projectEndAt: "2026-12-31T00:00:00.000000Z",
  status: "draft",
  tors: [TOR_A, TOR_B],
});

function serveProject(project: TenderProjects = PROJECT) {
  const requested: string[] = [];
  server.use(
    http.get(DETAIL_URL, ({ params }) => {
      requested.push(String(params.id));
      return HttpResponse.json({ data: project });
    }),
  );
  return requested;
}

async function renderPage(
  url = "/dashboard/tender-projects/detail?id=7",
  auth: Partial<CurrentUser> = { id: 1000, permissions: FULL_ACCESS },
) {
  setUrl(url);
  signInAs(auth);
  const rendered = renderWithQueryClient(<TenderProjectDetailPage />);
  return { ...rendered, user: userEvent.setup() };
}

// รอให้ทั้ง detail และ /auth/user โหลดครบ ก่อนเช็คว่า "ไม่มี" อะไรบนหน้า
async function settled(queryClient: { isFetching: () => number }) {
  await screen.findByText(PROJECT.name);
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
}

describe("TenderProjectDetailPage — ?id= handling", () => {
  it.each([
    ["missing", "/dashboard/tender-projects/detail"],
    ["zero", "/dashboard/tender-projects/detail?id=0"],
    ["negative", "/dashboard/tender-projects/detail?id=-3"],
    ["non-numeric", "/dashboard/tender-projects/detail?id=abc"],
    ["fractional", "/dashboard/tender-projects/detail?id=1.5"],
    ["empty", "/dashboard/tender-projects/detail?id="],
  ])("shows not-found without a request or spinner when id is %s", async (_name, url) => {
    const requested = serveProject();

    const { queryClient } = await renderPage(url);

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(requested).toEqual([]);
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการโครงการจัดซื้อจัดจ้าง", href: routes.dashboards.tender_project.index },
      { label: "ไม่พบข้อมูล" },
    ]);
  });

  it("requests the project with the id from the URL", async () => {
    const requested = serveProject();

    await renderPage("/dashboard/tender-projects/detail?id=7");

    expect(await screen.findByText(PROJECT.name)).toBeInTheDocument();
    expect(requested).toEqual(["7"]);
  });
});

describe("TenderProjectDetailPage — permission gate", () => {
  it("shows Forbidden and sends no detail request without tender_projects.viewAny", async () => {
    const requested = serveProject();

    const { queryClient } = await renderPage(undefined, { id: 1000, permissions: ["tors.viewAny"] });

    expect(await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(requested).toEqual([]);
  });
});

describe("TenderProjectDetailPage — loading and errors", () => {
  it("shows a spinner and a loading breadcrumb while the project is loading", async () => {
    server.use(http.get(DETAIL_URL, () => new Promise<never>(() => {})));

    await renderPage();

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(useBreadcrumbStore.getState().items).toEqual([
        { label: "จัดการโครงการจัดซื้อจัดจ้าง", href: routes.dashboards.tender_project.index },
        { loading: true },
      ]),
    );
  });

  it.each([
    ["404", 404, NOT_FOUND],
    // 500 = โหลดไม่สำเร็จ ไม่ใช่ไม่มีข้อมูล — บอกให้ลองใหม่
    ["500", 500, LOAD_ERROR_MESSAGE],
  ])("shows its message and stops the spinner on a %s", async (_name, status, message) => {
    server.use(http.get(DETAIL_URL, () => HttpResponse.json({ message: "x" }, { status })));

    await renderPage();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการโครงการจัดซื้อจัดจ้าง", href: routes.dashboards.tender_project.index },
      { label: "ไม่พบข้อมูล" },
    ]);
  });
});

describe("TenderProjectDetailPage — project details", () => {
  it("shows the code, name, description and every summary field", async () => {
    serveProject();

    await renderPage();

    expect(await screen.findByText(PROJECT.name)).toBeInTheDocument();
    expect(screen.getByText("TP-2026-007")).toBeInTheDocument();
    expect(screen.getByText("จัดซื้อคอมพิวเตอร์สำหรับสำนักงาน")).toBeInTheDocument();

    const field = (label: string) => screen.getByText(label).nextElementSibling as HTMLElement;
    expect(field("หน่วยงาน")).toHaveTextContent("สำนักงานเลขา");
    expect(field("ผู้รับผิดชอบ")).toHaveTextContent("สมหญิง รักงาน");
    expect(field("งบประมาณ")).toHaveTextContent("฿1,000,000");
    expect(field("เริ่มโครงการ").textContent).toMatch(/^5 ม\.ค\./);
    expect(field("สิ้นสุดโครงการ").textContent).toMatch(/^31 ธ\.ค\./);
  });

  it("sets the breadcrumb to the list link and the project name", async () => {
    serveProject();

    await renderPage();
    await screen.findByText(PROJECT.name);

    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการโครงการจัดซื้อจัดจ้าง", href: routes.dashboards.tender_project.index },
      { label: PROJECT.name },
    ]);
  });

  it("falls back to - for missing department, person in charge and dates", async () => {
    serveProject(
      makeTenderProject({
        id: 7,
        department: undefined,
        personInCharge: null,
        projectStartAt: undefined,
        projectEndAt: undefined,
        description: undefined,
      }),
    );

    await renderPage();
    await screen.findByText("ผู้รับผิดชอบ");

    const field = (label: string) => screen.getByText(label).nextElementSibling as HTMLElement;
    expect(field("หน่วยงาน")).toHaveTextContent("-");
    expect(field("ผู้รับผิดชอบ")).toHaveTextContent("-");
    expect(field("เริ่มโครงการ")).toHaveTextContent("-");
    expect(field("สิ้นสุดโครงการ")).toHaveTextContent("-");
  });

  it("shows - when the person in charge has no last name", async () => {
    serveProject(makeTenderProject({ id: 7, personInCharge: makeInternalProfile({ lastname: "" }) }));

    await renderPage();
    await screen.findByText("ผู้รับผิดชอบ");

    expect(screen.getByText("ผู้รับผิดชอบ").nextElementSibling).toHaveTextContent("-");
  });
});

describe("TenderProjectDetailPage — budget allocation", () => {
  it("renders the full allocation variant with the project's numbers", async () => {
    serveProject();

    await renderPage();

    expect(await screen.findByText("ยอดจัดสรร")).toBeInTheDocument();
    expect(screen.getByText(/฿250,000/)).toBeInTheDocument();
    expect(screen.getByText(/จาก ฿1,000,000/)).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("คงเหลือให้ตั้ง TOR ได้อีก ฿750,000")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "จัดสรร 25% ของงบประมาณ" })).toBeInTheDocument();
  });

  it("warns when the allocation is over budget", async () => {
    serveProject(makeTenderProject({ id: 7, budget: "1000000.00", allocatedBudget: "1200000.00" }));

    await renderPage();

    expect(await screen.findByText("เกินงบประมาณ ฿200,000")).toBeInTheDocument();
    expect(screen.queryByText(/คงเหลือให้ตั้ง TOR/)).not.toBeInTheDocument();
  });
});

describe("TenderProjectDetailPage — status", () => {
  it("shows a read-only badge without tender_projects.updateStatus", async () => {
    serveProject();

    const { queryClient } = await renderPage(undefined, { id: 1000, permissions: ["tender_projects.viewAny", "tors.viewAny"] });
    await settled(queryClient);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(screen.getByText(PROJECT.projectCode).parentElement!).getByText("ร่าง")).toBeInTheDocument();
  });

  it("shows the status select with tender_projects.updateStatus", async () => {
    serveProject();

    const { queryClient } = await renderPage();
    await settled(queryClient);

    expect(await screen.findByRole("combobox")).toHaveTextContent("ร่าง");
  });

  it("patches the project's status, toasts success and reloads the project", async () => {
    let current = PROJECT;
    const patched: unknown[] = [];
    server.use(
      http.get(DETAIL_URL, () => HttpResponse.json({ data: current })),
      http.patch(STATUS_URL, async ({ params, request }) => {
        patched.push({ id: params.id, body: await request.json() });
        current = { ...PROJECT, status: "published" };
        return HttpResponse.json({ data: current });
      }),
    );
    const { user } = await renderPage();

    await user.click(await screen.findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "กำลังดำเนินการ" }));

    await waitFor(() => expect(patched).toEqual([{ id: "7", body: { status: "published" } }]));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("เปลี่ยนสถานะสำเร็จ"));
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent("กำลังดำเนินการ"));
  });

  it("toasts the backend message on a 422", async () => {
    serveProject();
    server.use(
      http.patch(STATUS_URL, () => HttpResponse.json({ message: "ไม่สามารถเปลี่ยนสถานะได้" }, { status: 422 })),
    );
    const { user } = await renderPage();

    await user.click(await screen.findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "ยกเลิก" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ไม่สามารถเปลี่ยนสถานะได้"));
  });

  it("toasts the fallback message on other failures", async () => {
    serveProject();
    server.use(http.patch(STATUS_URL, () => HttpResponse.json({ message: "Server Error" }, { status: 500 })));
    const { user } = await renderPage();

    await user.click(await screen.findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "ยกเลิก" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  });

  // Base UI Select calls onValueChange even when the already-selected item is picked
  // (node_modules/@base-ui/react/select/item/SelectItem.js, no equality check), so the only
  // thing stopping this PATCH is the `next === status` guard in TenderProjectStatusSelect.
  it("sends no request when the current status is picked again", async () => {
    serveProject();
    const patch = vi.fn();
    server.use(
      http.patch(STATUS_URL, () => {
        patch();
        return HttpResponse.json({ data: PROJECT });
      }),
    );
    const { user, queryClient } = await renderPage();
    await settled(queryClient);

    await user.click(await screen.findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "ร่าง" }));

    expect(patch).not.toHaveBeenCalled();
  });
});

describe("TenderProjectDetailPage — TOR card", () => {
  it("lists the project's TORs with links to their detail pages", async () => {
    serveProject();

    await renderPage();

    expect(await screen.findByText("TOR ที่เกี่ยวข้อง")).toBeInTheDocument();
    expect(screen.getByText("เอกสารข้อกำหนดการจัดซื้อจัดจ้างภายใต้โครงการนี้")).toBeInTheDocument();
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("link", { name: "TOR-2026-001" })).toHaveAttribute(
      "href",
      routes.dashboards.tors.detail(21),
    );
    expect(within(rows[1]).getByRole("link", { name: "จัดซื้อเครื่องพิมพ์" })).toHaveAttribute(
      "href",
      routes.dashboards.tors.detail(22),
    );
  });

  it("shows the empty state when the project has no visible TORs", async () => {
    serveProject(makeTenderProject({ id: 7, tors: [] }));

    await renderPage();

    expect(await screen.findByText("ยังไม่มี TOR ภายใต้โครงการนี้")).toBeInTheDocument();
  });

  it("treats a response without tors as empty", async () => {
    serveProject(makeTenderProject({ id: 7 }));

    await renderPage();

    expect(await screen.findByText("ยังไม่มี TOR ภายใต้โครงการนี้")).toBeInTheDocument();
  });

  it.each(["tors.viewAny", "tors.viewDepartment", "tors.viewOwn"])("shows the card with %s", async (permission) => {
    serveProject();

    await renderPage(undefined, { id: 1000, permissions: ["tender_projects.viewAny", permission] });

    expect(await screen.findByText("TOR ที่เกี่ยวข้อง")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "TOR-2026-001" })).toBeInTheDocument();
  });

  it("hides the card without any tors.view* permission, even if the backend sent TORs", async () => {
    serveProject();

    const { queryClient } = await renderPage(undefined, {
      id: 1000,
      permissions: ["tender_projects.viewAny", "tender_projects.updateStatus", "tors.create"],
    });
    await settled(queryClient);

    expect(screen.queryByText("TOR ที่เกี่ยวข้อง")).not.toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มี TOR ภายใต้โครงการนี้")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("TenderProjectDetailPage — edit and delete", () => {
  const EDIT_ACCESS = [...FULL_ACCESS, "tender_projects.update", "tender_projects.delete"];

  // dialog แก้ไขโหลดตัวเลือกแผนกตั้งแต่ mount
  function serveEditLookups() {
    server.use(
      http.get(apiUrl("/api/v1/dashboard/departments/select"), () => HttpResponse.json({ data: [] })),
      http.get(apiUrl("/api/v1/dashboard/internal-profiles/select"), () => HttpResponse.json({ data: [] })),
    );
  }

  it("shows no edit or delete button without the permissions", async () => {
    serveProject();
    const { queryClient } = await renderPage();
    await settled(queryClient);

    expect(screen.queryByRole("button", { name: "แก้ไข" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ลบ" })).not.toBeInTheDocument();
  });

  it("opens the edit dialog seeded with the project", async () => {
    serveProject();
    serveEditLookups();
    const { user, queryClient } = await renderPage(undefined, { id: 1000, permissions: EDIT_ACCESS });
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "แก้ไข" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("แก้ไขโครงการจัดซื้อจัดจ้าง")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue(PROJECT.name)).toBeInTheDocument();
  });

  it("deletes the project after confirming and goes back to the list", async () => {
    serveProject();
    serveEditLookups();
    const deleted: string[] = [];
    server.use(
      http.delete(DETAIL_URL, ({ params }) => {
        deleted.push(String(params.id));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user, queryClient } = await renderPage(undefined, { id: 1000, permissions: EDIT_ACCESS });
    await settled(queryClient);

    await user.click(screen.getByRole("button", { name: "ลบ" }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "ลบโครงการ" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith(routes.dashboards.tender_project.index));
    expect(deleted).toEqual(["7"]);
  });

  it("hides edit and delete on a finished project without manageAnyStatus", async () => {
    serveProject({ ...PROJECT, status: "completed" });
    const { queryClient } = await renderPage(undefined, { id: 1000, permissions: EDIT_ACCESS });
    await settled(queryClient);

    expect(screen.queryByRole("button", { name: "แก้ไข" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ลบ" })).not.toBeInTheDocument();
  });

  it("still offers edit and delete on a finished project with manageAnyStatus", async () => {
    serveProject({ ...PROJECT, status: "completed" });
    serveEditLookups();
    const { queryClient } = await renderPage(undefined, { id: 1000, permissions: [...EDIT_ACCESS, "tender_projects.manageAnyStatus"] });
    await settled(queryClient);

    expect(screen.getByRole("button", { name: "แก้ไข" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ลบ" })).toBeInTheDocument();
  });
});
