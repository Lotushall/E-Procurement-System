import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import UserDetailPage from "@/app/dashboard/users/detail/page";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import type { UserDetail } from "@/lib/user/management/types";
import {
  makePermission,
  makeRole,
  makeUserDetail,
  makeUserSession,
} from "@/tests/fixtures/user-management";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const DETAIL_URL = apiUrl("/api/v1/dashboard/users/:id");
const SESSIONS_URL = apiUrl("/api/v1/dashboard/users/:id/sessions");
const NOT_FOUND = "ไม่พบข้อมูลผู้ใช้รายนี้";

const INTERNAL = makeUserDetail({
  id: 7,
  username: "somchai",
  email: "somchai@example.com",
  name: "สมชาย ใจดี",
  role: "officer",
  permissions: ["users.viewAny"],
});
const VENDOR = makeUserDetail({
  id: 9,
  username: "acme",
  email: "acme@example.com",
  name: "บริษัท เอซีเอ็มอี จำกัด",
  userType: "company",
  vendorProfileId: 3,
  role: null,
  internalProfile: null,
  permissions: [],
});

function serveDetail(detail: UserDetail) {
  const ids: unknown[] = [];
  server.use(
    http.get(DETAIL_URL, ({ params }) => {
      ids.push(params.id);
      return HttpResponse.json({ data: detail });
    }),
  );
  return ids;
}

function serveTabs() {
  server.use(
    http.get(apiUrl("/api/v1/dashboard/roles"), () =>
      HttpResponse.json({ data: [makeRole({ name: "officer", permissions: ["users.viewAny"] })] }),
    ),
    http.get(apiUrl("/api/v1/dashboard/permissions"), () =>
      HttpResponse.json({ data: [makePermission({ name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users" })] }),
    ),
    http.get(SESSIONS_URL, () =>
      HttpResponse.json({ data: [makeUserSession({ id: "s1", browser: "Chrome", os: "Windows", ipAddress: "192.168.1.10" })] }),
    ),
  );
}

// ค่าเริ่มต้นเห็นครบ: ดูรายการ + แก้ไข (แท็บ Sessions และปุ่มแก้ไขต้องมี users.update) — เคสที่เช็คการปฏิเสธส่ง permissions ที่จำกัดเอง
const FULL_ACCESS = ["users.viewAny", "users.update"];

async function renderPage(detail: UserDetail = INTERNAL, permissions: string[] = FULL_ACCESS) {
  signInAs({ id: 1000, permissions });
  serveTabs();
  const ids = serveDetail(detail);
  setUrl(`/dashboard/users/detail?id=${detail.id}`);
  const rendered = renderWithQueryClient(<UserDetailPage />);
  await screen.findByRole("heading", { level: 1, name: detail.username });
  return { ...rendered, ids, actor: userEvent.setup() };
}

describe("UserDetailPage — loading the user", () => {
  it("reads the id from ?id= and sets the breadcrumb to the user's name", async () => {
    const { ids } = await renderPage();

    expect(ids).toEqual(["7"]);
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการผู้ใช้", href: "/dashboard/users" },
      { label: "สมชาย ใจดี" },
    ]);
  });

  it("shows a spinner and a loading breadcrumb while the user is pending", async () => {
    signInAs({ permissions: ["users.viewAny"] });
    server.use(http.get(DETAIL_URL, () => new Promise<Response>(() => {})));
    setUrl("/dashboard/users/detail?id=7");

    renderWithQueryClient(<UserDetailPage />);

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(useBreadcrumbStore.getState().items).toEqual([
        { label: "จัดการผู้ใช้", href: "/dashboard/users" },
        { loading: true },
      ]),
    );
  });

  it.each([
    ["404", 404],
    ["500", 500],
  ])("shows the not-found message (not a spinner) when the detail request returns %s", async (_name, status) => {
    signInAs({ permissions: ["users.viewAny"] });
    server.use(http.get(DETAIL_URL, () => new HttpResponse(null, { status })));
    setUrl("/dashboard/users/detail?id=7");

    renderWithQueryClient(<UserDetailPage />);

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการผู้ใช้", href: "/dashboard/users" },
      { label: "ไม่พบข้อมูล" },
    ]);
  });

  it.each([
    ["missing", "/dashboard/users/detail"],
    ["zero", "/dashboard/users/detail?id=0"],
    ["negative", "/dashboard/users/detail?id=-3"],
    ["non-numeric", "/dashboard/users/detail?id=abc"],
  ])("shows not-found and requests no user when the id is %s", async (_name, url) => {
    signInAs({ permissions: ["users.viewAny"] });
    const requested: string[] = [];
    server.use(
      http.get(DETAIL_URL, () => {
        requested.push("detail");
        return HttpResponse.json({ data: INTERNAL });
      }),
      http.get(SESSIONS_URL, () => {
        requested.push("sessions");
        return HttpResponse.json({ data: [] });
      }),
    );
    setUrl(url);

    renderWithQueryClient(<UserDetailPage />);

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(requested).toEqual([]);
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการผู้ใช้", href: "/dashboard/users" },
      { label: "ไม่พบข้อมูล" },
    ]);
  });
});

describe("UserDetailPage — header and tabs", () => {
  it("renders the header for the loaded user", async () => {
    await renderPage();

    expect(screen.getByText("สมชาย ใจดี · somchai@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แก้ไข" })).toHaveAttribute("href", "/dashboard/users/edit?id=7");
  });

  it("starts on the Overview tab and passes the user to it", async () => {
    await renderPage();

    expect(screen.getByRole("tab", { name: "Overview", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Permissions", selected: false })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sessions", selected: false })).toBeInTheDocument();
    expect(screen.getByText("ข้อมูลบัญชี")).toBeInTheDocument();
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
  });

  it("switches to the Permissions tab and shows the user's role and permissions", async () => {
    const { actor } = await renderPage();

    await actor.click(screen.getByRole("tab", { name: "Permissions" }));

    expect(await screen.findByText("สิทธิ์การใช้งาน (Permissions)")).toBeInTheDocument();
    expect(await screen.findByText("ดูรายการผู้ใช้")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Permissions", selected: true })).toBeInTheDocument();
    expect(screen.queryByText("ข้อมูลบัญชี")).not.toBeInTheDocument();
  });

  it("switches to the Sessions tab and loads the sessions of the viewed user", async () => {
    const requestedIds: unknown[] = [];
    const { actor } = await renderPage();
    server.use(
      http.get(SESSIONS_URL, ({ params }) => {
        requestedIds.push(params.id);
        return HttpResponse.json({ data: [makeUserSession({ ipAddress: "10.1.1.1" })] });
      }),
    );

    await actor.click(screen.getByRole("tab", { name: "Sessions" }));

    expect(await screen.findByText("10.1.1.1")).toBeInTheDocument();
    expect(requestedIds).toEqual(["7"]);
    expect(screen.getByRole("heading", { name: "Active Sessions (1)" })).toBeInTheDocument();
  });

  it("returns to the Overview tab", async () => {
    const { actor } = await renderPage();

    await actor.click(screen.getByRole("tab", { name: "Permissions" }));
    await screen.findByText("สิทธิ์การใช้งาน (Permissions)");
    await actor.click(screen.getByRole("tab", { name: "Overview" }));

    expect(await screen.findByText("ข้อมูลบัญชี")).toBeInTheDocument();
    expect(screen.queryByText("สิทธิ์การใช้งาน (Permissions)")).not.toBeInTheDocument();
  });
});

describe("UserDetailPage — sessions and edit by users.update", () => {
  it("shows the Sessions tab and the Edit button with users.update", async () => {
    await renderPage(INTERNAL, ["users.viewAny", "users.update"]);

    expect(screen.getByRole("tab", { name: "Sessions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แก้ไข" })).toHaveAttribute("href", "/dashboard/users/edit?id=7");
  });

  it("hides the Sessions tab, the Edit button and the sessions request without users.update", async () => {
    const sessionRequests: unknown[] = [];
    const { queryClient } = await renderPage(INTERNAL, ["users.viewAny"]);
    server.use(
      http.get(SESSIONS_URL, ({ params }) => {
        sessionRequests.push(params.id);
        return HttpResponse.json({ data: [] });
      }),
    );

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Permissions" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Sessions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "แก้ไข" })).not.toBeInTheDocument();
    expect(sessionRequests).toEqual([]);
  });
});

describe("UserDetailPage — actions by permission", () => {
  it("shows the delete action with users.delete", async () => {
    await renderPage(INTERNAL, ["users.viewAny", "users.delete"]);

    expect(await screen.findByRole("button", { name: "ลบ user" })).toBeEnabled();
  });

  it("hides the delete action without users.delete", async () => {
    const { queryClient } = await renderPage(INTERNAL, ["users.viewAny"]);

    await waitFor(() => expect(queryClient.getQueryData(["auth", "user"])).toBeTruthy());
    expect(screen.queryByRole("button", { name: "ลบ user" })).not.toBeInTheDocument();
  });

  it("links a vendor user to the vendor page and shows a personal-info note", async () => {
    await renderPage(VENDOR);

    expect(screen.getByRole("button", { name: "ดูข้อมูลผู้ค้า" })).toHaveAttribute(
      "href",
      "/dashboard/vendors/detail?id=3",
    );
    expect(screen.getByText("นิติบุคคล")).toBeInTheDocument();
    expect(screen.getByText("ไม่มีข้อมูลส่วนตัวเพิ่มเติมสำหรับผู้ใช้ประเภทนี้")).toBeInTheDocument();
  });
});

describe("UserDetailPage — permission gate", () => {
  it("shows Forbidden and sends no detail request without users.viewAny", async () => {
    signInAs({ permissions: [] });
    const ids = serveDetail(INTERNAL);
    setUrl("/dashboard/users/detail?id=7");

    renderWithQueryClient(<UserDetailPage />);

    expect(await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeInTheDocument();
    expect(ids).toEqual([]);
  });
});
