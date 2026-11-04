import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it } from "vitest";
import CreateUserPage from "@/app/dashboard/users/create/page";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import { makeAvailableInternalProfile } from "@/tests/fixtures/internal-profiles";
import { makePermission, makeRole, makeUserDetail } from "@/tests/fixtures/user-management";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const ROLES_URL = apiUrl("/api/v1/dashboard/roles");
const PERMISSIONS_URL = apiUrl("/api/v1/dashboard/permissions");
const PROFILES_URL = apiUrl("/api/v1/dashboard/internal-profiles/select-available");
const CREATE_URL = apiUrl("/api/v1/dashboard/users");

const FALLBACK = "สร้าง user ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const LOAD_ERROR = "ไม่สามารถโหลดข้อมูลที่จำเป็นสำหรับฟอร์มได้ กรุณาลองใหม่อีกครั้ง";
const ROLES = [
  makeRole({ id: 1, name: "admin", permissions: ["users.viewAny", "users.create"] }),
  makeRole({ id: 2, name: "officer", permissions: ["users.viewAny"] }),
];
const PERMISSIONS = [
  makePermission({ name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users" }),
  makePermission({ name: "users.create", label: "สร้างผู้ใช้", group: "users" }),
  makePermission({ name: "vendors.approve", label: "อนุมัติผู้ค้า", group: "vendors" }),
];
const PROFILES = [
  makeAvailableInternalProfile({ id: 11, name: "สมชาย ใจดี" }),
  makeAvailableInternalProfile({ id: 12, name: "สมหญิง รักงาน" }),
];

type UserEvent = ReturnType<typeof userEvent.setup>;

// InputField ไม่ผูก <label> กับ input (เป็น <p>) จึงหา input จากข้อความ label ที่อยู่ในกลุ่มเดียวกัน
function field(label: string): HTMLInputElement {
  const input = screen.getByText(label).closest("div.flex-col")?.querySelector("input");
  if (!input) throw new Error(`input not found for label ${label}`);
  return input;
}

function comboboxOf(label: string): HTMLElement {
  const wrapper = screen.getByText(label).closest("div.flex-col") as HTMLElement;
  return within(wrapper).getByRole("combobox");
}

function serveLookups() {
  server.use(
    http.get(ROLES_URL, () => HttpResponse.json({ data: ROLES })),
    http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: PERMISSIONS })),
    http.get(PROFILES_URL, () => HttpResponse.json({ data: PROFILES })),
  );
}

function serveCreate(
  response: () => Response | Promise<Response> = () => HttpResponse.json({ data: makeUserDetail() }, { status: 201 }),
) {
  const bodies: unknown[] = [];
  server.use(
    http.post(CREATE_URL, async ({ request }) => {
      bodies.push(await request.json());
      return response();
    }),
  );
  return bodies;
}

async function renderPage() {
  signInAs({ permissions: ["users.create"] });
  serveLookups();
  setUrl("/dashboard/users/create");
  const rendered = renderWithQueryClient(<CreateUserPage />);
  const user = userEvent.setup();
  await screen.findByRole("button", { name: "บันทึก" });
  return { ...rendered, user };
}

async function chooseProfile(user: UserEvent, name: string) {
  await user.click(comboboxOf("พนักงาน"));
  await user.click(await screen.findByRole("option", { name }));
}

async function chooseRole(user: UserEvent, name: string) {
  await user.click(comboboxOf("บทบาท (Role)"));
  await user.click(await screen.findByRole("option", { name }));
}

async function fillValid(user: UserEvent) {
  await chooseProfile(user, "สมหญิง รักงาน");
  await user.type(field("Username"), "somying");
  await user.type(field("อีเมล"), "somying@example.com");
  await user.type(field("รหัสผ่าน"), "secret-pass");
  await chooseRole(user, "officer");
}

describe("CreateUserPage — permission gate", () => {
  it("shows the forbidden screen and requests nothing without users.create", async () => {
    signInAs({ permissions: ["users.viewAny"] });
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
      http.get(PROFILES_URL, () => {
        requested.push("profiles");
        return HttpResponse.json({ data: PROFILES });
      }),
    );
    setUrl("/dashboard/users/create");

    renderWithQueryClient(<CreateUserPage />);

    expect(await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "เพิ่ม user" })).not.toBeInTheDocument();
    expect(requested).toEqual([]);
  });

  it("renders the form with users.create", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { name: "เพิ่ม user" })).toBeInTheDocument();
    expect(screen.getByText("สร้างบัญชี internal user ใหม่สำหรับพนักงานภายใน")).toBeInTheDocument();
    expect(screen.queryByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).not.toBeInTheDocument();
  });
});

describe("CreateUserPage — loading the form", () => {
  it("shows a spinner while the lookups are pending", async () => {
    signInAs({ permissions: ["users.create"] });
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json({ data: ROLES })),
      http.get(PERMISSIONS_URL, () => new Promise<Response>(() => {})),
      http.get(PROFILES_URL, () => HttpResponse.json({ data: PROFILES })),
    );
    setUrl("/dashboard/users/create");

    renderWithQueryClient(<CreateUserPage />);

    await screen.findByRole("heading", { name: "เพิ่ม user" });
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึก" })).not.toBeInTheDocument();
  });

  it("shows the load error when the permission list fails", async () => {
    signInAs({ permissions: ["users.create"] });
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json({ data: ROLES })),
      http.get(PERMISSIONS_URL, () => new HttpResponse(null, { status: 500 })),
      http.get(PROFILES_URL, () => HttpResponse.json({ data: PROFILES })),
    );
    setUrl("/dashboard/users/create");

    renderWithQueryClient(<CreateUserPage />);

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึก" })).not.toBeInTheDocument();
  });

  it("shows the load error when the available profiles fail", async () => {
    signInAs({ permissions: ["users.create"] });
    server.use(
      http.get(ROLES_URL, () => HttpResponse.json({ data: ROLES })),
      http.get(PERMISSIONS_URL, () => HttpResponse.json({ data: PERMISSIONS })),
      http.get(PROFILES_URL, () => new HttpResponse(null, { status: 500 })),
    );
    setUrl("/dashboard/users/create");

    renderWithQueryClient(<CreateUserPage />);

    expect(await screen.findByText(LOAD_ERROR)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึก" })).not.toBeInTheDocument();
  });

  it("sets the breadcrumb and links cancel back to the list", async () => {
    await renderPage();

    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "จัดการผู้ใช้", href: "/dashboard/users" },
      { label: "เพิ่ม user" },
    ]);
    expect(screen.getByRole("button", { name: "ยกเลิก" })).toHaveAttribute("href", "/dashboard/users");
  });
});

describe("CreateUserPage — role and permissions", () => {
  it("lists only the available profiles in the employee picker", async () => {
    const { user } = await renderPage();

    await user.click(comboboxOf("พนักงาน"));

    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["สมชาย ใจดี", "สมหญิง รักงาน"]);
  });

  it("starts with no permission checked", async () => {
    await renderPage();

    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
  });

  it("checks the permissions of the chosen role and replaces them when the role changes", async () => {
    const { user } = await renderPage();

    await chooseRole(user, "admin");

    expect(screen.getByRole("checkbox", { name: /users\.viewAny/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /users\.create/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /vendors\.approve/ })).not.toBeChecked();

    await chooseRole(user, "officer");

    expect(screen.getByRole("checkbox", { name: /users\.viewAny/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /users\.create/ })).not.toBeChecked();
  });
});

describe("CreateUserPage — validation", () => {
  it("blocks the request and shows every required-field error", async () => {
    const { user } = await renderPage();
    const bodies = serveCreate();

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText("กรุณาเลือกพนักงาน")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอก username")).toBeInTheDocument();
    expect(screen.getByText("อีเมลไม่ถูกต้อง")).toBeInTheDocument();
    expect(screen.getByText("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")).toBeInTheDocument();
    expect(screen.getByText("กรุณาเลือก role")).toBeInTheDocument();
    expect(bodies).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("rejects a short password even when everything else is valid", async () => {
    const { user } = await renderPage();
    const bodies = serveCreate();
    await chooseProfile(user, "สมหญิง รักงาน");
    await user.type(field("Username"), "somying");
    await user.type(field("อีเมล"), "somying@example.com");
    await user.type(field("รหัสผ่าน"), "short");
    await chooseRole(user, "officer");

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    expect(await screen.findByText("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });
});

describe("CreateUserPage — submitting", () => {
  it("posts the exact payload with the profile id as a number and the role's permissions", async () => {
    const { user } = await renderPage();
    const bodies = serveCreate();
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      username: "somying",
      email: "somying@example.com",
      password: "secret-pass",
      role: "officer",
      permissions: ["users.viewAny"],
      internalProfileId: 12,
    });
  });

  it("sends the permissions as edited on top of the role", async () => {
    const { user } = await renderPage();
    const bodies = serveCreate();
    await fillValid(user);
    await user.click(screen.getByRole("checkbox", { name: /vendors\.approve/ }));
    await user.click(screen.getByRole("checkbox", { name: /users\.viewAny/ }));

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ role: "officer", permissions: ["vendors.approve"] });
  });

  it("toasts success and returns to the user list", async () => {
    const { user } = await renderPage();
    serveCreate();
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledExactlyOnceWith("สร้าง user สำเร็จ"));
    expect(router.push).toHaveBeenCalledExactlyOnceWith("/dashboard/users");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("disables the save button and sends a single request while pending", async () => {
    const { user } = await renderPage();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const bodies = serveCreate(async () => {
      await gate;
      return HttpResponse.json({ data: makeUserDetail() }, { status: 201 });
    });
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "บันทึก" })).toBeDisabled());
    await user.click(screen.getByRole("button", { name: "บันทึก" }));
    expect(bodies).toHaveLength(1);
    expect(router.push).not.toHaveBeenCalled();

    release();

    await waitFor(() => expect(router.push).toHaveBeenCalledExactlyOnceWith("/dashboard/users"));
    expect(bodies).toHaveLength(1);
  });
});

describe("CreateUserPage — failures", () => {
  // current toast-only 422 behaviour — remove this test when the BUG skip below ("422 username/email taken is only toasted") is fixed
  it("toasts the first field message of a 422 and stays on the page with the input kept", async () => {
    const { user } = await renderPage();
    serveCreate(() =>
      HttpResponse.json(
        {
          message: "The given data was invalid.",
          errors: { username: ["Username นี้ถูกใช้แล้ว"], email: ["อีเมลนี้ถูกใช้แล้ว"] },
        },
        { status: 422 },
      ),
    );
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("Username นี้ถูกใช้แล้ว"));
    expect(router.push).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "บันทึก" })).toBeEnabled();
    expect(field("Username")).toHaveValue("somying");
  });

  it("toasts the backend message for other errors", async () => {
    const { user } = await renderPage();
    serveCreate(() => HttpResponse.json({ message: "ไม่มีสิทธิ์สร้าง user" }, { status: 403 }));
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("ไม่มีสิทธิ์สร้าง user"));
    expect(router.push).not.toHaveBeenCalled();
  });

  it("falls back to the default message when the error has no message", async () => {
    const { user } = await renderPage();
    serveCreate(() => new HttpResponse(null, { status: 500 }));
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(FALLBACK));
    expect(router.push).not.toHaveBeenCalled();
  });

  it.skip("BUG: app/dashboard/users/_hooks/use-create-user-form.ts:9-22 422 username/email taken is only toasted; it should be shown on the username/email field", async () => {
    const { user } = await renderPage();
    serveCreate(() => HttpResponse.json({ errors: { username: ["Username นี้ถูกใช้แล้ว"] } }, { status: 422 }));
    await fillValid(user);

    await user.click(screen.getByRole("button", { name: "บันทึก" }));

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน form แปลว่าแสดงที่ช่องแล้ว
    const form = field("Username").closest("form") as HTMLElement;
    expect(await within(form).findByText("Username นี้ถูกใช้แล้ว")).toBeInTheDocument();
    expect(field("Username")).toHaveAttribute("aria-invalid", "true");
  });
});
