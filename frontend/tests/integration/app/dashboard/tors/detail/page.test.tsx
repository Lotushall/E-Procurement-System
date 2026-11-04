import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import TorDetailPage from "@/app/dashboard/tors/detail/page";
import type { CurrentUser } from "@/lib/auth/types";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { LOAD_ERROR_MESSAGE } from "@/lib/detail-page";
import { routes } from "@/lib/routes";
import type { Tor } from "@/lib/tender/tor/types";
import { makeTor, makeTorUserSummary } from "@/tests/fixtures/tors";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { freezeTimeAt } from "@/tests/helpers/time";
import { setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const DETAIL_URL = apiUrl("/api/v1/dashboard/tors/:id");
const BASE = "/dashboard/tors/detail";
const NOT_FOUND = "ไม่พบข้อมูล TOR นี้";
const FORBIDDEN = "คุณไม่มีสิทธิ์เข้าถึงหน้านี้";
const LIST_CRUMB = { label: "การจัดการ TOR", href: routes.dashboards.tors.index };

// ช่วงรับซองคำนวณ "เหลือ N วัน" จากเวลาปัจจุบัน
freezeTimeAt("2026-11-02T10:00:00+07:00");

const TOR = makeTor({
  id: 7,
  torCode: "TOR-2026-007",
  title: "จัดซื้อคอมพิวเตอร์โน้ตบุ๊ก",
  scopeOfWork: "บรรทัดแรก\nบรรทัดที่สอง",
  budgetEstimate: "1234567.50",
  procurementMethod: "คัดเลือก",
  fiscalYear: 2026,
  status: "bidding",
  biddingStartAt: "2026-11-01T09:00:00+07:00",
  biddingEndAt: "2026-11-20T16:00:00+07:00",
  remark: "ต้องแนบใบเสนอราคา",
  approvedAt: "2026-10-30T09:00:00+07:00",
  createdAt: "2026-01-05T08:00:00+07:00",
  department: { id: 3, name: "สำนักงานเลขา" },
  tenderProject: { id: 12, projectCode: "TP-2026-012", name: "จัดซื้อครุภัณฑ์คอมพิวเตอร์" },
  createdBy: makeTorUserSummary({ id: 5, name: "สมชาย ใจดี", department: { id: 1, name: "จัดซื้อ" } }),
  approvedBy: makeTorUserSummary({ id: 6, name: "สมศรี รักงาน", department: { id: 2, name: "บัญชี" } }),
});

function serveTor(tor: Tor = TOR) {
  const requested: string[] = [];
  server.use(
    http.get(DETAIL_URL, ({ params }) => {
      requested.push(String(params.id));
      return HttpResponse.json({ data: tor });
    }),
  );
  return requested;
}

// ค่าเริ่มต้น = ดูได้ทุกรายการ (tors.viewAny) — เคสที่ทดสอบการปฏิเสธส่ง permissions ที่จำกัดเองทุกครั้ง
async function renderPage(url = `${BASE}?id=7`, auth: Partial<CurrentUser> = { id: 1000, permissions: ["tors.viewAny"] }) {
  setUrl(url);
  signInAs(auth);
  const rendered = renderWithQueryClient(<TorDetailPage />);
  return { ...rendered, user: userEvent.setup() };
}

const field = (label: string) => screen.getByText(label).nextElementSibling as HTMLElement;

describe("TorDetailPage — permission gate", () => {
  it.each(["tors.viewAny", "tors.viewDepartment", "tors.viewOwn"])(
    "shows the TOR to a user holding only %s",
    async (permission) => {
      serveTor();

      await renderPage(`${BASE}?id=7`, { id: 1000, permissions: [permission] });

      expect(await screen.findByText(TOR.title)).toBeInTheDocument();
    },
  );

  it.each([
    ["no permission", []],
    ["only create/update/delete permissions", ["tors.create", "tors.update", "tors.delete"]],
    ["a permission from another module", ["tender_projects.viewAny"]],
  ])("shows Forbidden and sends no detail request with %s", async (_name, permissions) => {
    const requested = serveTor();

    const { queryClient } = await renderPage(`${BASE}?id=7`, { id: 1000, permissions });

    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(requested).toEqual([]);
    expect(screen.queryByText(TOR.title)).not.toBeInTheDocument();
    expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
  });
});

describe("TorDetailPage — ?id= handling", () => {
  it.each([
    ["missing", BASE],
    ["zero", `${BASE}?id=0`],
    ["negative", `${BASE}?id=-3`],
    ["non-numeric", `${BASE}?id=abc`],
    ["fractional", `${BASE}?id=1.5`],
    ["partly numeric", `${BASE}?id=7abc`],
    ["empty", `${BASE}?id=`],
  ])("shows not-found without a request or spinner when id is %s", async (_name, url) => {
    const requested = serveTor();

    const { queryClient } = await renderPage(url);

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(requested).toEqual([]);
    expect(useBreadcrumbStore.getState().items).toEqual([LIST_CRUMB, { label: "ไม่พบข้อมูล" }]);
  });

  it("requests the TOR with the id from the URL", async () => {
    const requested = serveTor();

    await renderPage(`${BASE}?id=7`);

    expect(await screen.findByText(TOR.title)).toBeInTheDocument();
    expect(requested).toEqual(["7"]);
  });
});

describe("TorDetailPage — loading and errors", () => {
  it("shows a spinner and a loading breadcrumb while the TOR is loading", async () => {
    const requested = vi.fn();
    server.use(
      http.get(DETAIL_URL, () => {
        requested();
        return new Promise<never>(() => {});
      }),
    );

    await renderPage();

    await waitFor(() => expect(requested).toHaveBeenCalledOnce());
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
    await waitFor(() => expect(useBreadcrumbStore.getState().items).toEqual([LIST_CRUMB, { loading: true }]));
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
    expect(useBreadcrumbStore.getState().items).toEqual([LIST_CRUMB, { label: "ไม่พบข้อมูล" }]);
  });
});

describe("TorDetailPage — summary card", () => {
  it("shows the code, status, title and every summary field", async () => {
    serveTor();

    await renderPage();

    expect(await screen.findByText(TOR.title)).toBeInTheDocument();
    expect(screen.getByText("TOR-2026-007")).toBeInTheDocument();
    expect(within(screen.getByText("TOR-2026-007").parentElement!).getByText("เปิดรับซอง")).toBeInTheDocument();
    expect(field("หน่วยงาน")).toHaveTextContent("สำนักงานเลขา");
    expect(field("ราคากลาง")).toHaveTextContent("฿1,234,567.5");
    expect(field("ปีงบประมาณ")).toHaveTextContent("2026");
    expect(field("วิธีจัดซื้อจัดจ้าง")).toHaveTextContent("คัดเลือก");
    expect(field("วันที่สร้าง")).toHaveTextContent("5 ม.ค. 2026");
  });

  it("links the tender project to its detail page with code and name", async () => {
    serveTor();

    await renderPage();

    const link = await screen.findByRole("link", { name: "TP-2026-012 · จัดซื้อครุภัณฑ์คอมพิวเตอร์" });
    expect(link).toHaveAttribute("href", routes.dashboards.tender_project.detail(12));
    expect(field("โครงการ")).toContainElement(link);
  });

  it("says the TOR belongs to no project, without a link, when tenderProject is null", async () => {
    serveTor(makeTor({ id: 7, tenderProject: null }));

    await renderPage();

    await screen.findByText("โครงการ");
    expect(field("โครงการ")).toHaveTextContent(/^ไม่สังกัดโครงการ$/);
    expect(within(field("โครงการ")).queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps the satang of the budget", async () => {
    serveTor(makeTor({ id: 7, budgetEstimate: "500000.55" }));

    await renderPage();

    await screen.findByText("ราคากลาง");
    expect(field("ราคากลาง")).toHaveTextContent("฿500,000.55");
  });

  it("sets the breadcrumb to the list link and the TOR title", async () => {
    serveTor();

    await renderPage();
    await screen.findByText(TOR.title);

    expect(useBreadcrumbStore.getState().items).toEqual([LIST_CRUMB, { label: TOR.title }]);
  });
});

describe("TorDetailPage — bidding window", () => {
  it("shows the range and the days left while bidding is open", async () => {
    serveTor();

    await renderPage();

    await screen.findByText("ช่วงรับซอง");
    expect(field("ช่วงรับซอง")).toHaveTextContent("1 พ.ย. – 20 พ.ย. 26");
    expect(field("ช่วงรับซอง")).toHaveTextContent("เหลือ 18 วัน");
  });

  it("counts down to the start of bidding for a published TOR", async () => {
    serveTor(makeTor({ id: 7, status: "published", biddingStartAt: "2026-11-05T09:00:00+07:00", biddingEndAt: "2026-11-20T16:00:00+07:00" }));

    await renderPage();

    await screen.findByText("ช่วงรับซอง");
    expect(field("ช่วงรับซอง")).toHaveTextContent("เริ่มรับซองในอีก 3 วัน");
  });

  it("says the window is not set when there are no bidding dates", async () => {
    serveTor(makeTor({ id: 7, status: "draft", biddingStartAt: null, biddingEndAt: null }));

    await renderPage();

    await screen.findByText("ช่วงรับซอง");
    expect(field("ช่วงรับซอง")).toHaveTextContent(/^ยังไม่กำหนด$/);
  });

  it("starts the range at publication when there is no start date", async () => {
    serveTor(makeTor({ id: 7, status: "draft", biddingStartAt: null, biddingEndAt: "2026-11-20T16:00:00+07:00" }));

    await renderPage();

    await screen.findByText("ช่วงรับซอง");
    expect(field("ช่วงรับซอง")).toHaveTextContent("เมื่อประกาศ – 20 พ.ย. 26");
  });

  it("strikes through the range of a cancelled TOR", async () => {
    serveTor(makeTor({ id: 7, status: "cancelled", biddingStartAt: "2026-11-10T09:00:00+07:00", biddingEndAt: "2026-11-20T16:00:00+07:00" }));

    await renderPage();

    await screen.findByText("ช่วงรับซอง");
    expect(within(field("ช่วงรับซอง")).getByText("10 พ.ย. – 20 พ.ย. 26")).toHaveClass("line-through");
  });
});

describe("TorDetailPage — scope of work", () => {
  it("shows the scope of work in its own card, keeping line breaks", async () => {
    serveTor();

    await renderPage();

    const heading = await screen.findByText("ขอบเขตงาน");
    const body = heading.closest("[data-slot=card]")!.querySelector("p")!;
    expect(body.textContent).toBe("บรรทัดแรก\nบรรทัดที่สอง");
    expect(body).toHaveClass("whitespace-pre-line");
  });
});

describe("TorDetailPage — people", () => {
  it("shows the creator and the approver with their departments, and the approval date", async () => {
    serveTor();

    await renderPage();

    await screen.findByText("ผู้เกี่ยวข้อง");
    expect(field("ผู้สร้าง")).toHaveTextContent(/^สมชาย ใจดี · จัดซื้อ$/);
    expect(field("ผู้อนุมัติ")).toHaveTextContent(/^สมศรี รักงาน · บัญชี · 30 ต.ค. 2026$/);
  });

  it("shows a single dash for each person when there is no creator and no approver", async () => {
    serveTor(makeTor({ id: 7, createdBy: null, approvedBy: null, approvedAt: null }));

    await renderPage();

    await screen.findByText("ผู้เกี่ยวข้อง");
    expect(field("ผู้สร้าง")).toHaveTextContent(/^-$/);
    expect(field("ผู้อนุมัติ")).toHaveTextContent(/^-$/);
  });

  it("omits the approval date when the TOR has an approver but no approvedAt", async () => {
    serveTor(makeTor({ id: 7, approvedBy: makeTorUserSummary({ name: "สมศรี รักงาน", department: { id: 2, name: "บัญชี" } }), approvedAt: null }));

    await renderPage();

    await screen.findByText("ผู้เกี่ยวข้อง");
    expect(field("ผู้อนุมัติ")).toHaveTextContent(/^สมศรี รักงาน · บัญชี$/);
  });

  it("shows no approval date when there is no approver, even if approvedAt is set", async () => {
    serveTor(makeTor({ id: 7, approvedBy: null, approvedAt: "2026-10-30T09:00:00+07:00" }));

    await renderPage();

    await screen.findByText("ผู้เกี่ยวข้อง");
    expect(field("ผู้อนุมัติ")).toHaveTextContent(/^-$/);
  });

  it("shows a dash for a person without a name", async () => {
    serveTor(makeTor({ id: 7, createdBy: makeTorUserSummary({ name: null, department: { id: 1, name: "จัดซื้อ" } }) }));

    await renderPage();

    await screen.findByText("ผู้เกี่ยวข้อง");
    expect(field("ผู้สร้าง")).toHaveTextContent(/^- · จัดซื้อ$/);
  });

  it("shows a dash for a person without a department", async () => {
    serveTor(makeTor({ id: 7, createdBy: makeTorUserSummary({ name: "สมชาย ใจดี", department: null }) }));

    await renderPage();

    await screen.findByText("ผู้เกี่ยวข้อง");
    expect(field("ผู้สร้าง")).toHaveTextContent(/^สมชาย ใจดี · -$/);
  });
});

describe("TorDetailPage — remark", () => {
  it("shows the remark in its own card", async () => {
    serveTor();

    await renderPage();

    const heading = await screen.findByText("หมายเหตุ");
    expect(heading.closest("[data-slot=card]")).toHaveTextContent("ต้องแนบใบเสนอราคา");
  });

  it.each([
    ["null", null],
    ["empty", ""],
    ["only spaces", "   \n "],
  ])("hides the remark card when the remark is %s", async (_name, remark) => {
    serveTor(makeTor({ id: 7, remark }));

    await renderPage();

    await screen.findByText("ผู้เกี่ยวข้อง");
    expect(screen.queryByText("หมายเหตุ")).not.toBeInTheDocument();
  });
});
