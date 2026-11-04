import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Register from "@/app/(auth)/register/page";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const REGISTER_URL = apiUrl("/api/v1/auth/register");
const RESEND_URL = apiUrl("/api/v1/auth/email/resend");

type User = ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  server.use(http.get(apiUrl("/sanctum/csrf-cookie"), () => new HttpResponse(null, { status: 204 })));
});

const byPlaceholder = (text: string) => screen.getByPlaceholderText(text);

async function fillCommon(user: User, emailPlaceholder: string) {
  await user.type(byPlaceholder("0X-XXX-XXXX"), "0812345678");
  await user.type(byPlaceholder("เช่น siamheavy หรือ somchai.p"), "siamheavy");
  await user.type(byPlaceholder(emailPlaceholder), "vendor@example.com");
  await user.type(byPlaceholder("อย่างน้อย 8 ตัวอักษร"), "password123");
  await user.type(byPlaceholder("กรอกรหัสผ่านอีกครั้ง"), "password123");
}

async function fillCompany(user: User) {
  await user.type(byPlaceholder("เช่น บริษัท สยาม เฮฟวี่ จำกัด"), "บริษัท สยาม เฮฟวี่ จำกัด");
  await user.type(byPlaceholder("0-0000-00000-00-0"), "1234567890121");
  await fillCommon(user, "name@company.co.th");
}

async function fillIndividual(user: User) {
  await user.click(screen.getByRole("tab", { name: "บุคคลธรรมดา" }));
  await user.type(byPlaceholder("เช่น นายสมชาย ใจดี"), "นายสมชาย ใจดี");
  await user.type(byPlaceholder("เช่น ร้านสมชายวัสดุก่อสร้าง"), "ร้านสมชายวัสดุก่อสร้าง");
  await user.type(byPlaceholder("X-XXXX-XXXXX-XX-X"), "9876543210989");
  await fillCommon(user, "name@gmail.com");
}

const acceptTerms = (user: User) => user.click(screen.getByRole("checkbox"));
const submit = (user: User) => user.click(screen.getByRole("button", { name: "สร้างบัญชีผู้ค้า" }));

function captureRegister(status = 201) {
  const state: { body?: unknown } = {};
  server.use(
    http.post(REGISTER_URL, async ({ request }) => {
      state.body = await request.json();
      return new HttpResponse(null, { status });
    }),
  );
  return state;
}

describe("Register page - vendor type", () => {
  it("starts on the company tab with company fields only", () => {
    renderWithQueryClient(<Register />);

    expect(screen.getByRole("tab", { name: "นิติบุคคล" })).toHaveAttribute("aria-selected", "true");
    expect(byPlaceholder("เช่น บริษัท สยาม เฮฟวี่ จำกัด")).toBeInTheDocument();
    expect(byPlaceholder("0-0000-00000-00-0")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("เช่น นายสมชาย ใจดี")).not.toBeInTheDocument();
  });

  it("swaps the required fields when switching to individual", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await user.click(screen.getByRole("tab", { name: "บุคคลธรรมดา" }));

    expect(byPlaceholder("เช่น นายสมชาย ใจดี")).toBeInTheDocument();
    expect(byPlaceholder("เช่น ร้านสมชายวัสดุก่อสร้าง")).toBeInTheDocument();
    expect(byPlaceholder("X-XXXX-XXXXX-XX-X")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("เช่น บริษัท สยาม เฮฟวี่ จำกัด")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("0-0000-00000-00-0")).not.toBeInTheDocument();
  });

  it("reports the required company fields", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await acceptTerms(user);
    await submit(user);

    expect(await screen.findByText("กรุณากรอกชื่อบริษัท / นิติบุคคล")).toBeInTheDocument();
    expect(screen.getByText("เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกเบอร์ติดต่อ")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกชื่อผู้ใช้")).toBeInTheDocument();
    expect(screen.queryByText("กรุณากรอกชื่อ – นามสกุล")).not.toBeInTheDocument();
  });

  it("reports the required individual fields", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await user.click(screen.getByRole("tab", { name: "บุคคลธรรมดา" }));
    await acceptTerms(user);
    await submit(user);

    expect(await screen.findByText("กรุณากรอกชื่อ – นามสกุล")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกชื่อร้านค้า")).toBeInTheDocument();
    expect(screen.getByText("เลขบัตรประชาชนต้องมี 13 หลัก")).toBeInTheDocument();
    expect(screen.queryByText("กรุณากรอกชื่อบริษัท / นิติบุคคล")).not.toBeInTheDocument();
  });
});

describe("Register page - Thai id check digit", () => {
  it("rejects a tax id with a wrong check digit and does not send", async () => {
    const state = captureRegister();
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillCompany(user);
    await user.clear(byPlaceholder("0-0000-00000-00-0"));
    await user.type(byPlaceholder("0-0000-00000-00-0"), "1234567890123");
    await acceptTerms(user);
    await submit(user);

    expect(await screen.findByText("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง")).toBeInTheDocument();
    expect(state.body).toBeUndefined();
  });

  it("rejects an id card with a wrong check digit and does not send", async () => {
    const state = captureRegister();
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillIndividual(user);
    await user.clear(byPlaceholder("X-XXXX-XXXXX-XX-X"));
    await user.type(byPlaceholder("X-XXXX-XXXXX-XX-X"), "9876543210987");
    await acceptTerms(user);
    await submit(user);

    expect(await screen.findByText("เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง")).toBeInTheDocument();
    expect(state.body).toBeUndefined();
  });
});

describe("Register page - masked inputs", () => {
  it("formats the tax id as the user types and caps it at 13 digits", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await user.type(byPlaceholder("0-0000-00000-00-0"), "12-34ab5678901234567");

    expect(byPlaceholder("0-0000-00000-00-0")).toHaveValue("1-2345-67890-12-3");
  });

  it("formats the id card on the individual tab", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await user.click(screen.getByRole("tab", { name: "บุคคลธรรมดา" }));
    await user.type(byPlaceholder("X-XXXX-XXXXX-XX-X"), "9876543210987");

    expect(byPlaceholder("X-XXXX-XXXXX-XX-X")).toHaveValue("9-8765-43210-98-7");
  });

  it("formats a 9-digit and a 10-digit phone number differently", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);
    const phone = byPlaceholder("0X-XXX-XXXX");

    await user.type(phone, "081234567");
    expect(phone).toHaveValue("08-123-4567");

    await user.type(phone, "8");
    expect(phone).toHaveValue("081-234-5678");

    await user.type(phone, "9");
    expect(phone).toHaveValue("081-234-5678");
  });

  it("keeps the phone number when switching vendor type", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await user.type(byPlaceholder("0X-XXX-XXXX"), "0812345678");
    await user.click(screen.getByRole("tab", { name: "บุคคลธรรมดา" }));

    expect(byPlaceholder("0X-XXX-XXXX")).toHaveValue("081-234-5678");
  });
});

describe("Register page - terms", () => {
  it("disables the submit button until the terms are accepted", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);
    const button = screen.getByRole("button", { name: "สร้างบัญชีผู้ค้า" });
    expect(button).toBeDisabled();

    await acceptTerms(user);
    expect(button).toBeEnabled();

    await acceptTerms(user);
    expect(button).toBeDisabled();
  });

  it("never sends a request when the terms are not accepted", async () => {
    const register = vi.fn();
    server.use(
      http.post(REGISTER_URL, () => {
        register();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillCompany(user);
    await submit(user);

    expect(register).not.toHaveBeenCalled();
  });

  it("opens the terms and the privacy policy in dialogs", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await user.click(screen.getByRole("button", { name: "ข้อกำหนดและเงื่อนไข" }));
    expect(await screen.findByRole("dialog", { name: "ข้อกำหนดและเงื่อนไขการใช้งาน" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "เปิดฉบับเต็มในแท็บใหม่" })).toHaveAttribute("href", "/terms");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "นโยบายความเป็นส่วนตัว" }));
    expect(await screen.findByRole("dialog", { name: "นโยบายความเป็นส่วนตัว" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "เปิดฉบับเต็มในแท็บใหม่" })).toHaveAttribute("href", "/privacy");
  });
});

describe("Register page - submit", () => {
  it("shows validation errors for mismatched passwords and does not send", async () => {
    const state = captureRegister();
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillCompany(user);
    await user.clear(byPlaceholder("กรอกรหัสผ่านอีกครั้ง"));
    await user.type(byPlaceholder("กรอกรหัสผ่านอีกครั้ง"), "different123");
    await acceptTerms(user);
    await submit(user);

    expect(await screen.findByText("รหัสผ่านไม่ตรงกัน")).toBeInTheDocument();
    expect(state.body).toBeUndefined();
  });

  it("sends the company payload and shows the verify-email state", async () => {
    const state = captureRegister();
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillCompany(user);
    await acceptTerms(user);
    await submit(user);

    expect(await screen.findByText("กรุณายืนยันอีเมลของคุณ")).toBeInTheDocument();
    expect(state.body).toEqual({
      vendorType: "company",
      companyName: "บริษัท สยาม เฮฟวี่ จำกัด",
      taxId: "1-2345-67890-12-1",
      phone: "081-234-5678",
      username: "siamheavy",
      email: "vendor@example.com",
      password: "password123",
      confirmPassword: "password123",
      password_confirmation: "password123",
      terms: true,
    });
    expect(screen.getByText("vendor@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ไปหน้าเข้าสู่ระบบ" })).toHaveAttribute("href", "/login");
  });

  it("sends the individual payload without company fields", async () => {
    const state = captureRegister();
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillIndividual(user);
    await acceptTerms(user);
    await submit(user);

    expect(await screen.findByText("กรุณายืนยันอีเมลของคุณ")).toBeInTheDocument();
    expect(state.body).toEqual({
      vendorType: "individual",
      fullName: "นายสมชาย ใจดี",
      idCard: "9-8765-43210-98-9",
      storeName: "ร้านสมชายวัสดุก่อสร้าง",
      phone: "081-234-5678",
      username: "siamheavy",
      email: "vendor@example.com",
      password: "password123",
      confirmPassword: "password123",
      password_confirmation: "password123",
      terms: true,
    });
  });

  it("maps 422 field errors onto the fields", async () => {
    server.use(
      http.post(REGISTER_URL, () =>
        HttpResponse.json(
          {
            message: "invalid",
            errors: { email: ["อีเมลนี้ถูกใช้งานแล้ว"], username: ["ชื่อผู้ใช้นี้ถูกใช้งานแล้ว"] },
          },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillCompany(user);
    await acceptTerms(user);
    await submit(user);

    expect(await screen.findByText("อีเมลนี้ถูกใช้งานแล้ว")).toBeInTheDocument();
    expect(screen.getByText("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว")).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.queryByText("กรุณายืนยันอีเมลของคุณ")).not.toBeInTheDocument();
  });

  it("shows the backend message in a toast for other failures", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    server.use(http.post(REGISTER_URL, () => HttpResponse.json({ message: "ระบบปิดปรับปรุง" }, { status: 503 })));
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillCompany(user);
    await acceptTerms(user);
    await submit(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ระบบปิดปรับปรุง"));
  });

  it("falls back to the generic message when the backend sends none", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    server.use(http.post(REGISTER_URL, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillCompany(user);
    await acceptTerms(user);
    await submit(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  });

  it("falls back to the generic message for a 422 without field errors", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    server.use(http.post(REGISTER_URL, () => HttpResponse.json({}, { status: 422 })));
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillCompany(user);
    await acceptTerms(user);
    await submit(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  });

  it("disables the submit button while the request is pending", async () => {
    server.use(http.post(REGISTER_URL, () => new Promise<never>(() => {})));
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await fillCompany(user);
    await acceptTerms(user);
    await submit(user);

    expect(await screen.findByRole("button", { name: "กำลังสร้างบัญชี..." })).toBeDisabled();
  });

  it("toggles both password fields independently", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);
    const password = byPlaceholder("อย่างน้อย 8 ตัวอักษร");
    const confirm = byPlaceholder("กรอกรหัสผ่านอีกครั้ง");

    const [togglePassword, toggleConfirm] = screen.getAllByRole("button", { name: "แสดงรหัสผ่าน" });
    await user.click(togglePassword);
    expect(password).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "password");

    await user.click(toggleConfirm);
    expect(confirm).toHaveAttribute("type", "text");
  });
});

describe("Register page - resend verification", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function registerAndReachVerifyState(user: User) {
    captureRegister();
    await fillCompany(user);
    await acceptTerms(user);
    await submit(user);
    await screen.findByText("กรุณายืนยันอีเมลของคุณ");
  }

  function waitOutCooldown() {
    for (let i = 0; i < 60; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
  }

  it("starts a 60 second cooldown and enables resend afterwards", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);

    await registerAndReachVerifyState(user);

    expect(screen.getByRole("button", { name: "ส่งอีกครั้งได้ใน 60 วินาที" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: "ส่งอีกครั้งได้ใน 59 วินาที" })).toBeDisabled();

    for (let i = 0; i < 59; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByRole("button", { name: "ไม่ได้รับอีเมล? ส่งอีกครั้ง" })).toBeEnabled();
  });

  it("resends the verification email and restarts the cooldown", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    let body: unknown;
    server.use(
      http.post(RESEND_URL, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);
    await registerAndReachVerifyState(user);
    waitOutCooldown();

    await user.click(screen.getByRole("button", { name: "ไม่ได้รับอีเมล? ส่งอีกครั้ง" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("ส่งลิงก์ยืนยันอีกครั้งแล้ว กรุณาตรวจสอบกล่องจดหมาย"),
    );
    expect(body).toEqual({ email: "vendor@example.com" });
    expect(screen.getByRole("button", { name: "ส่งอีกครั้งได้ใน 60 วินาที" })).toBeDisabled();
  });

  it("shows an error toast when resending fails", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    server.use(http.post(RESEND_URL, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);
    await registerAndReachVerifyState(user);
    waitOutCooldown();

    await user.click(screen.getByRole("button", { name: "ไม่ได้รับอีเมล? ส่งอีกครั้ง" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
