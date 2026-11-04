import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import EditUserPage from "@/app/dashboard/users/edit/page";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import type { UserDetail } from "@/lib/user/management/types";
import { makePermission, makeRole, makeUserDetail } from "@/tests/fixtures/user-management";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const DETAIL_URL = apiUrl("/api/v1/dashboard/users/:id");
const ROLES_URL = apiUrl("/api/v1/dashboard/roles");
const PERMISSIONS_URL = apiUrl("/api/v1/dashboard/permissions");

const FALLBACK = "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const NOT_FOUND = "ไม่พบข้อมูลผู้ใช้รายนี้";
const PERMISSIONS_ERROR = "ไม่สามารถโหลดรายการ permission ได้ กรุณาลองใหม่อีกครั้ง";
const ROLES = [
  makeRole({ id: 1, name: "admin", permissions: ["users.viewAny", "users.create"] }),
  makeRole({ id: 2, name: "officer", permissions: ["users.viewAny"] }),
];
const PERMISSIONS = [
  makePermission({ name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users" }),
  makePermission({ name: "users.create", label: "สร้างผู้ใช้", group: "users" }),
  makePermission({ name: "vendors.approve", label: "อนุมัติผู้ค้า", group: "vendors" }),
];

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

// InputField ไม่ผูก <label> กับ input (เป็น <p>) จึงหา input จากข้อความ label ที่อยู่ในกลุ่มเดียวกัน
function field(label: string): HTMLInputElement {
  const input = screen.getByText(label).closest("div.flex-col")?.querySelector("input");
  if (!input) throw new Error(`input not found for label ${label}`);
  return input;
}

function roleCombobox(): HTMLElement {
  const wrapper = screen.getByText("บทบาท (Role)").closest("div.flex-col") as HTMLElement;
  return within(wrapper).getByRole("combobox");
}

function serveLookups() {
  server.use(
    http.get(ROLES_URL, () => HttpResponse.json({ data: ROLES })),
    http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: PERMISSIONS })),
  );
}

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

function serveUpdate(
  response: () => Response | Promise<Response> = () => HttpResponse.json({ data: INTERNAL }),
) {
  const calls: { id: unknown; body: unknown }[] = [];
  server.use(
    http.patch(DETAIL_URL, async ({ request, params }) => {
      calls.push({ id: params.id, body: await request.json() });
      return response();
    }),
  );
  return calls;
}

async function renderPage(detail: UserDetail = INTERNAL) {
  signInAs({ permissions: ["users.update"] });
  serveLookups();
  serveDetail(detail);
  setUrl(`/dashboard/users/edit?id=${detail.id}`);
  const rendered = renderWithQueryClient(<EditUserPage />);
  const user = userEvent.setup();
  await screen.findByRole("button", { name: "บันทึกการแก้ไข" });
  return { ...rendered, user };
}

const save = () => screen.getByRole("button", { name: "บันทึกการแก้ไข" });

describe("EditUserPage — permission gate", () => {
  it("shows the forbidden screen and requests nothing without users.update", async () => {
    signInAs({ permissions: ["users.viewAny"] });
    const requested: string[] = [];
    server.use(
      http.get(DETAIL_URL, () => {
        requested.push("detail");
        return HttpResponse.json({ data: INTERNAL });
      }),
      http.get(ROLES_URL, () => {
        requested.push("roles");
        return HttpResponse.json({ data: ROLES });
      }),
      http.get(PERMISSIONS_URL, () => {
        requested.push("permissions");
        return HttpResponse.json({ data: PERMISSIONS });
      }),
    );
    setUrl("/dashboard/users/edit?id=7");

    renderWithQueryClient(<EditUserPage />);

    expect(await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "แก้ไข user" })).not.toBeInTheDocument();
    expect(requested).toEqual([]);
  });

  it("renders the form with users.update", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "แก้ไข user" })).toBeInTheDocument();
    expect(screen.queryByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).not.toBeInTheDocument();
  });
});

describe("EditUserPage — loading the user", () => {
  it("reads the user id from ?id= and sets the breadcrumb to the user's name", async () => {
    signInAs({ permissions: ["users.update"] });
    serveLookups();
    const ids = serveDetail(INTERNAL);
    setUrl("/dashboard/users/edit?id=7");

    renderWithQueryClient(<EditUserPage />);

    await screen.findByRole("button", { name: "บันทึกการแก้ไข" });
    expect(ids).toEqual(["7"]);
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการผู้ใช้", href: "/dashboard/users" },
      { label: "แก้ไข สมชาย ใจดี" },
    ]);
  });

  it("shows a spinner and a loading breadcrumb while the user is pending", async () => {
    signInAs({ permissions: ["users.update"] });
    serveLookups();
    server.use(http.get(DETAIL_URL, () => new Promise<Response>(() => {})));
    setUrl("/dashboard/users/edit?id=7");

    renderWithQueryClient(<EditUserPage />);

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "แก้ไข user" })).not.toBeInTheDocument();
    expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
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
    signInAs({ permissions: ["users.update"] });
    serveLookups();
    server.use(http.get(DETAIL_URL, () => new HttpResponse(null, { status })));
    setUrl("/dashboard/users/edit?id=7");

    renderWithQueryClient(<EditUserPage />);

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึกการแก้ไข" })).not.toBeInTheDocument();
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการผู้ใช้", href: "/dashboard/users" },
      { label: "ไม่พบข้อมูล" },
    ]);
  });

  it.each([
    ["missing", "/dashboard/users/edit"],
    ["zero", "/dashboard/users/edit?id=0"],
    ["negative", "/dashboard/users/edit?id=-3"],
    ["non-numeric", "/dashboard/users/edit?id=abc"],
  ])("shows not-found and requests no user when the id is %s", async (_name, url) => {
    signInAs({ permissions: ["users.update"] });
    const requested: string[] = [];
    server.use(
      http.get(DETAIL_URL, () => {
        requested.push("detail");
        return HttpResponse.json({ data: INTERNAL });
      }),
    );
    setUrl(url);

    renderWithQueryClient(<EditUserPage />);

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(requested).toEqual([]);
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการผู้ใช้", href: "/dashboard/users" },
      { label: "ไม่พบข้อมูล" },
    ]);
  });
});

describe("EditUserPage — internal user form", () => {
  it("mentions the profile/role in the description and prefills the form from the user", async () => {
    await renderPage();

    expect(screen.getByText("แก้ไขข้อมูลบัญชีและโปรไฟล์/role ของ สมชาย ใจดี")).toBeInTheDocument();
    expect(field("Username")).toHaveValue("somchai");
    expect(field("อีเมล")).toHaveValue("somchai@example.com");
    expect(field("รหัสผ่านใหม่")).toHaveValue("");
    expect(field("รหัสผ่านใหม่")).toHaveAttribute("placeholder", "เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน");
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toHaveAttribute("href", "/dashboard/users/detail?id=7");
  });

  it("shows the user's role and ticks the user's permissions", async () => {
    await renderPage();

    await waitFor(() => expect(roleCombobox()).toHaveTextContent("officer"));
    expect(screen.getByRole("checkbox", { name: /users\.viewAny/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /users\.create/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /vendors\.approve/ })).not.toBeChecked();
  });

  it("replaces the ticked permissions with the new role's permissions when the role changes", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(roleCombobox()).toHaveTextContent("officer"));
    await user.click(screen.getByRole("checkbox", { name: /vendors\.approve/ }));

    await user.click(roleCombobox());
    await user.click(await screen.findByRole("option", { name: "admin" }));

    expect(roleCombobox()).toHaveTextContent("admin");
    expect(screen.getByRole("checkbox", { name: /users\.viewAny/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /users\.create/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /vendors\.approve/ })).not.toBeChecked();
  });

  it("shows a spinner in place of the form while permissions load", async () => {
    signInAs({ permissions: ["users.update"] });
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json({ data: ROLES })),
      http.get(PERMISSIONS_URL, () => new Promise<Response>(() => {})),
    );
    serveDetail(INTERNAL);
    setUrl("/dashboard/users/edit?id=7");

    renderWithQueryClient(<EditUserPage />);

    await screen.findByRole("heading", { name: "แก้ไข user" });
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึกการแก้ไข" })).not.toBeInTheDocument();
  });

  it("shows the permission load error when the permission list fails", async () => {
    signInAs({ permissions: ["users.update"] });
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json({ data: ROLES })),
      http.get(PERMISSIONS_URL, () => new HttpResponse(null, { status: 500 })),
    );
    serveDetail(INTERNAL);
    setUrl("/dashboard/users/edit?id=7");

    renderWithQueryClient(<EditUserPage />);

    expect(await screen.findByText(PERMISSIONS_ERROR)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึกการแก้ไข" })).not.toBeInTheDocument();
  });
});

describe("EditUserPage — saving an internal user", () => {
  it("omits the password when it is left empty and sends the form values as they are", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(roleCombobox()).toHaveTextContent("officer"));
    const calls = serveUpdate();

    await user.click(save());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      id: "7",
      body: {
        username: "somchai",
        email: "somchai@example.com",
        role: "officer",
        permissions: ["users.viewAny"],
      },
    });
    expect(calls[0].body).not.toHaveProperty("password");
  });

  it("sends the edited fields, a new password, the new role and its permissions", async () => {
    const { user } = await renderPage();
    await waitFor(() => expect(roleCombobox()).toHaveTextContent("officer"));
    const calls = serveUpdate();
    await user.clear(field("Username"));
    await user.type(field("Username"), "somchai2");
    await user.clear(field("อีเมล"));
    await user.type(field("อีเมล"), "new@example.com");
    await user.type(field("รหัสผ่านใหม่"), "brand-new-pass");
    await user.click(roleCombobox());
    await user.click(await screen.findByRole("option", { name: "admin" }));
    await user.click(screen.getByRole("checkbox", { name: /vendors\.approve/ }));

    await user.click(save());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toEqual({
      username: "somchai2",
      email: "new@example.com",
      password: "brand-new-pass",
      role: "admin",
      permissions: ["users.viewAny", "users.create", "vendors.approve"],
    });
  });

  it("toasts success and goes to the user's detail page", async () => {
    const { user } = await renderPage();
    serveUpdate();

    await user.click(save());

    await waitFor(() => expect(toast.success).toHaveBeenCalledExactlyOnceWith("บันทึกข้อมูลสำเร็จ"));
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/dashboard/users/detail?id=7");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("invalidates the cached user detail after saving", async () => {
    const { user, queryClient } = await renderPage();
    serveUpdate();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await user.click(save());

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["users"] }));
    expect(router.push).toHaveBeenCalledWith("/dashboard/users/detail?id=7");
  });

  it("blocks the request when the username or email is cleared or the password is too short", async () => {
    const { user } = await renderPage();
    const calls = serveUpdate();
    await user.clear(field("Username"));
    await user.clear(field("อีเมล"));
    await user.type(field("รหัสผ่านใหม่"), "short");

    await user.click(save());

    expect(await screen.findByText("กรุณากรอก username")).toBeInTheDocument();
    expect(screen.getByText("อีเมลไม่ถูกต้อง")).toBeInTheDocument();
    expect(screen.getByText("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")).toBeInTheDocument();
    expect(calls).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("disables the save button and sends a single request while pending", async () => {
    const { user } = await renderPage();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls = serveUpdate(async () => {
      await gate;
      return HttpResponse.json({ data: INTERNAL });
    });

    await user.click(save());

    await waitFor(() => expect(save()).toBeDisabled());
    await user.click(save());
    expect(calls).toHaveLength(1);
    expect(router.push).not.toHaveBeenCalled();

    release();

    await waitFor(() => expect(router.push).toHaveBeenCalledExactlyOnceWith("/dashboard/users/detail?id=7"));
    expect(calls).toHaveLength(1);
  });

  it("on a 422 toasts a check-the-form message and stays on the page", async () => {
    const { user } = await renderPage();
    serveUpdate(() =>
      HttpResponse.json(
        { message: "The given data was invalid.", errors: { email: ["อีเมลนี้ถูกใช้แล้ว"] } },
        { status: 422 },
      ),
    );

    await user.click(save());

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(router.push).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(save()).toBeEnabled();
  });

  it("toasts the backend message for other errors", async () => {
    const { user } = await renderPage();
    serveUpdate(() => HttpResponse.json({ message: "ไม่สามารถแก้ไขผู้ใช้นี้ได้" }, { status: 403 }));

    await user.click(save());

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("ไม่สามารถแก้ไขผู้ใช้นี้ได้"));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("falls back to the default message when the error has no message", async () => {
    const { user } = await renderPage();
    serveUpdate(() => new HttpResponse(null, { status: 500 }));

    await user.click(save());

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(FALLBACK));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows a 422 email taken on the email field", async () => {
    const { user } = await renderPage();
    serveUpdate(() => HttpResponse.json({ errors: { email: ["อีเมลนี้ถูกใช้แล้ว"] } }, { status: 422 }));

    await user.click(save());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน form แปลว่าแสดงที่ช่องแล้ว
    const form = field("อีเมล").closest("form") as HTMLElement;
    expect(await within(form).findByText("อีเมลนี้ถูกใช้แล้ว")).toBeInTheDocument();
    expect(field("อีเมล")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("EditUserPage — vendor (non-internal) user", () => {
  it("shows only the account form: no role or permission fields, and no profile/role wording", async () => {
    await renderPage(VENDOR);

    expect(screen.getByText("แก้ไขข้อมูลบัญชี ของ บริษัท เอซีเอ็มอี จำกัด")).toBeInTheDocument();
    expect(field("Username")).toHaveValue("acme");
    expect(field("อีเมล")).toHaveValue("acme@example.com");
    expect(field("รหัสผ่านใหม่")).toHaveValue("");
    expect(screen.queryByText("บทบาท (Role)")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toHaveAttribute("href", "/dashboard/users/detail?id=9");
  });

  it("does not request roles or permissions", async () => {
    signInAs({ permissions: ["users.update"] });
    const requested: string[] = [];
    server.use(
      http.get(ROLES_URL, () => {
        requested.push("roles");
        return HttpResponse.json({ data: ROLES });
      }),
      http.get(PERMISSIONS_URL, () => {
        requested.push("permissions");
        return HttpResponse.json({ data: PERMISSIONS });
      }),
    );
    serveDetail(VENDOR);
    setUrl("/dashboard/users/edit?id=9");

    renderWithQueryClient(<EditUserPage />);
    await screen.findByRole("button", { name: "บันทึกการแก้ไข" });

    expect(requested).toEqual([]);
  });

  it("omits the empty password and sends only username and email, then returns to detail", async () => {
    const { user } = await renderPage(VENDOR);
    const calls = serveUpdate();

    await user.click(save());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ id: "9", body: { username: "acme", email: "acme@example.com" } });
    await waitFor(() => expect(toast.success).toHaveBeenCalledExactlyOnceWith("บันทึกข้อมูลสำเร็จ"));
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/dashboard/users/detail?id=9");
  });

  it("sends a new password along with the edited fields", async () => {
    const { user } = await renderPage(VENDOR);
    const calls = serveUpdate();
    await user.clear(field("Username"));
    await user.type(field("Username"), "acme2");
    await user.type(field("รหัสผ่านใหม่"), "brand-new-pass");

    await user.click(save());

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toEqual({ username: "acme2", email: "acme@example.com", password: "brand-new-pass" });
  });

  it("blocks the request on invalid input", async () => {
    const { user } = await renderPage(VENDOR);
    const calls = serveUpdate();
    await user.clear(field("อีเมล"));
    await user.type(field("อีเมล"), "not-an-email");

    await user.click(save());

    expect(await screen.findByText("อีเมลไม่ถูกต้อง")).toBeInTheDocument();
    expect(calls).toEqual([]);
  });

  it("disables the save button and sends a single request while pending", async () => {
    const { user } = await renderPage(VENDOR);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls = serveUpdate(async () => {
      await gate;
      return HttpResponse.json({ data: VENDOR });
    });

    await user.click(save());

    await waitFor(() => expect(save()).toBeDisabled());
    await user.click(save());
    expect(calls).toHaveLength(1);

    release();

    await waitFor(() => expect(router.push).toHaveBeenCalledExactlyOnceWith("/dashboard/users/detail?id=9"));
  });

  it("on a 422 toasts a check-the-form message", async () => {
    const { user } = await renderPage(VENDOR);
    serveUpdate(() => HttpResponse.json({ errors: { username: ["Username นี้ถูกใช้แล้ว"] } }, { status: 422 }));

    await user.click(save());

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("toasts the backend message, else the fallback", async () => {
    const { user } = await renderPage(VENDOR);
    serveUpdate(() => HttpResponse.json({ message: "บัญชีนี้ถูกล็อก" }, { status: 409 }));

    await user.click(save());

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("บัญชีนี้ถูกล็อก"));

    serveUpdate(() => new HttpResponse(null, { status: 500 }));
    await user.click(save());

    await waitFor(() => expect(toast.error).toHaveBeenLastCalledWith(FALLBACK));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows a 422 username taken on the username field", async () => {
    const { user } = await renderPage(VENDOR);
    serveUpdate(() => HttpResponse.json({ errors: { username: ["Username นี้ถูกใช้แล้ว"] } }, { status: 422 }));

    await user.click(save());

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน form แปลว่าแสดงที่ช่องแล้ว
    const form = field("Username").closest("form") as HTMLElement;
    expect(await within(form).findByText("Username นี้ถูกใช้แล้ว")).toBeInTheDocument();
    expect(field("Username")).toHaveAttribute("aria-invalid", "true");
  });
});
