import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import AccountInfoSection from "@/app/(public)/profiles/_components/account-info-section";
import { makeCurrentUser } from "@/tests/fixtures/users";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

// InputField ไม่ได้ผูก <label> กับ input (เป็น <p>) จึงหา input จากข้อความ label ที่อยู่ในกลุ่มเดียวกัน
function field(label: string): HTMLInputElement {
  const input = screen.getByText(label).closest("div.flex-col")?.querySelector("input");
  if (!input) throw new Error(`input not found for label ${label}`);
  return input;
}

const ACCOUNT_URL = apiUrl("/api/v1/auth/account");

async function renderLoaded(overrides = {}) {
  const user = signInAs({ username: "vendor1", email: "vendor@example.com", ...overrides });
  const rendered = renderWithQueryClient(<AccountInfoSection />);
  await waitFor(() => expect(field("ชื่อผู้ใช้")).toHaveValue(user.username));
  return { user, ...rendered };
}

describe("AccountInfoSection", () => {
  it("prefills username and email from the current user", async () => {
    await renderLoaded();

    expect(field("ชื่อผู้ใช้")).toHaveValue("vendor1");
    expect(field("อีเมล")).toHaveValue("vendor@example.com");
    expect(screen.getByRole("button", { name: "บันทึกข้อมูล" })).toBeEnabled();
  });

  it("shows the unverified badge only when the email is not verified", async () => {
    const { unmount } = await renderLoaded({ emailVerifiedAt: null });
    expect(screen.getByText("ยังไม่ยืนยัน")).toBeInTheDocument();
    unmount();

    await renderLoaded({ emailVerifiedAt: "2026-01-01T00:00:00Z" });
    expect(screen.queryByText("ยังไม่ยืนยัน")).not.toBeInTheDocument();
  });

  it("blocks submit and shows field errors for invalid input", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(ACCOUNT_URL, spy));
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(field("ชื่อผู้ใช้"));
    await user.clear(field("อีเมล"));
    await user.click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));

    expect(await screen.findByText("กรุณากรอกชื่อผู้ใช้")).toBeInTheDocument();
    expect(screen.getByText("อีเมลไม่ถูกต้อง")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("saves, toasts, and refreshes the cached user (email unchanged)", async () => {
    let body: unknown;
    let current = makeCurrentUser({ username: "vendor1", email: "vendor@example.com" });
    server.use(
      http.get(apiUrl("/api/v1/auth/user"), () => HttpResponse.json({ data: current })),
      http.post(ACCOUNT_URL, async ({ request }) => {
        body = await request.json();
        current = { ...current, username: "renamed" };
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { queryClient } = renderWithQueryClient(<AccountInfoSection />);
    await waitFor(() => expect(field("ชื่อผู้ใช้")).toHaveValue("vendor1"));

    await user.clear(field("ชื่อผู้ใช้"));
    await user.type(field("ชื่อผู้ใช้"), "renamed");
    await user.click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลบัญชีแล้ว"));
    expect(body).toEqual({ username: "renamed", email: "vendor@example.com" });
    await waitFor(() =>
      expect(queryClient.getQueryData<{ username: string }>(["auth", "user"])?.username).toBe("renamed"),
    );
  });

  it("tells the user to verify the new address when the email changed", async () => {
    server.use(http.post(ACCOUNT_URL, () => new HttpResponse(null, { status: 204 })));
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(field("อีเมล"));
    await user.type(field("อีเมล"), "new@example.com");
    await user.click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "บันทึกข้อมูลบัญชีแล้ว ระบบส่งลิงก์ยืนยันไปที่อีเมลใหม่ กรุณายืนยันก่อนใช้งาน",
      ),
    );
  });

  it("disables the button and shows progress while saving", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(ACCOUNT_URL, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));

    expect(await screen.findByRole("button", { name: "กำลังบันทึก..." })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByRole("button", { name: "บันทึกข้อมูล" })).toBeEnabled());
  });

  it("on a 422 toasts a check-the-form message", async () => {
    server.use(
      http.post(ACCOUNT_URL, () =>
        HttpResponse.json(
          { message: "invalid", errors: { username: ["ชื่อผู้ใช้นี้ถูกใช้แล้ว"], email: ["x"] } },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
  });

  it("shows a 422 username taken on the username field", async () => {
    server.use(
      http.post(ACCOUNT_URL, () =>
        HttpResponse.json({ message: "invalid", errors: { username: ["ชื่อผู้ใช้นี้ถูกใช้แล้ว"] } }, { status: 422 }),
      ),
    );
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));

    // toast ถูก mock จึงไม่มีข้อความใน DOM — ถ้าเจอใน form แปลว่าแสดงที่ช่องแล้ว
    const form = field("ชื่อผู้ใช้").closest("form") as HTMLElement;
    expect(await within(form).findByText("ชื่อผู้ใช้นี้ถูกใช้แล้ว")).toBeInTheDocument();
    expect(field("ชื่อผู้ใช้")).toHaveAttribute("aria-invalid", "true");
  });

  it("toasts the backend message on other failures", async () => {
    server.use(http.post(ACCOUNT_URL, () => HttpResponse.json({ message: "เซิร์ฟเวอร์ขัดข้อง" }, { status: 500 })));
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เซิร์ฟเวอร์ขัดข้อง"));
  });

  it("falls back to the Thai default message when the failure has no message", async () => {
    server.use(http.post(ACCOUNT_URL, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("บันทึกข้อมูลบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"),
    );
  });
});
