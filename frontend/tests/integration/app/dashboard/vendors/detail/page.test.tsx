import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import VendorDetailPage from "@/app/dashboard/vendors/detail/page";
import type { CurrentUser } from "@/lib/auth/types";
import { useBreadcrumbStore } from "@/lib/breadcrumb/store";
import type { VendorDetail, VendorVerificationStatus } from "@/lib/vendor/approval/types";
import { makeVendorDetail } from "@/tests/fixtures/vendor-approval";
import {
  makeIndividualVendorProfile,
  makeVendorContact,
  makeVendorDocument,
} from "@/tests/fixtures/vendor-profile";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router, setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const DETAIL_URL = apiUrl("/api/v1/vendors/:id");
const ACTION_URL = apiUrl("/api/v1/vendors/:id/:action");
const FALLBACK = "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
const NOT_FOUND = "ไม่พบข้อมูลผู้ค้ารายนี้";
const COMPANY_NAME = "บริษัท ตัวอย่าง จำกัด";

function companyVendor(overrides: Partial<VendorDetail> = {}): VendorDetail {
  return makeVendorDetail({ id: 7, ...overrides });
}

// เซิร์ฟเวอร์จำลองแบบมีสถานะ: approve/reject/pending เปลี่ยนสถานะ แล้ว refetch จะเห็นค่าใหม่
function serveVendor(initial: VendorDetail | null) {
  const state = { vendor: initial, detailRequests: [] as string[] };
  const actions: { id: unknown; action: unknown; body: unknown }[] = [];
  server.use(
    http.get(DETAIL_URL, ({ params }) => {
      state.detailRequests.push(String(params.id));
      if (!state.vendor) return HttpResponse.json({ message: "Not found" }, { status: 404 });
      return HttpResponse.json({ data: state.vendor });
    }),
    http.post(ACTION_URL, async ({ params, request }) => {
      const text = await request.text();
      actions.push({ id: params.id, action: params.action, body: text ? JSON.parse(text) : undefined });
      if (state.vendor) {
        const next: Record<string, VendorVerificationStatus> = {
          approve: "approved",
          reject: "rejected",
          pending: "pending",
        };
        const body = text ? (JSON.parse(text) as { remark?: string }) : {};
        state.vendor = {
          ...state.vendor,
          verificationStatus: next[String(params.action)],
          remark: body.remark ?? null,
        } as VendorDetail;
      }
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(DETAIL_URL, () => {
      state.vendor = null;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { state, actions };
}

// สิทธิ์ครบ: ดู + อนุมัติ/ปฏิเสธ (review) + ลบ (delete) — เคสที่ทดสอบการปฏิเสธส่ง permissions ที่จำกัดเอง
const FULL_ACCESS = ["vendors.viewAny", "vendors.review", "vendors.delete"];

async function renderPage(
  url = "/dashboard/vendors/detail?id=7",
  auth: Partial<CurrentUser> = { permissions: FULL_ACCESS },
) {
  setUrl(url);
  signInAs(auth);
  const rendered = renderWithQueryClient(<VendorDetailPage />);
  // หน้านี้ครอบด้วย RequirePermission — รอให้ /auth/user โหลดเสร็จและ gate ตัดสินก่อนเช็คเนื้อหา
  await waitFor(() => expect(rendered.queryClient.getQueryData(["auth", "user"])).toBeTruthy());
  return { ...rendered, user: userEvent.setup() };
}

const bottomBar = () => document.querySelector("[data-bottom-bar]") as HTMLElement;
const heading = () => screen.findAllByRole("heading", { level: 1 });

describe("VendorDetailPage — id and not-found states", () => {
  it.each([
    ["missing", "/dashboard/vendors/detail"],
    ["non-numeric", "/dashboard/vendors/detail?id=abc"],
    ["zero", "/dashboard/vendors/detail?id=0"],
    ["negative", "/dashboard/vendors/detail?id=-3"],
  ])("shows the not-found text without any request when the id is %s", async (_name, url) => {
    const { state } = serveVendor(companyVendor());
    await renderPage(url);

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(state.detailRequests).toEqual([]);
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "ผู้ค้าที่ลงทะเบียน", href: "/dashboard/vendors" },
      { label: "ไม่พบข้อมูล" },
    ]);
  });

  it("requests the vendor whose id is in the URL", async () => {
    const { state } = serveVendor(companyVendor({ id: 42 }));
    await renderPage("/dashboard/vendors/detail?id=42");

    await heading();
    expect(state.detailRequests).toEqual(["42"]);
  });

  it("shows a spinner and a loading breadcrumb while the vendor is loading", async () => {
    server.use(http.get(DETAIL_URL, () => new Promise(() => {})));
    await renderPage();

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "ผู้ค้าที่ลงทะเบียน", href: "/dashboard/vendors" },
      { loading: true },
    ]);
  });

  it("shows the not-found text on a 404", async () => {
    serveVendor(null);
    await renderPage();

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(useBreadcrumbStore.getState().items.at(-1)).toEqual({ label: "ไม่พบข้อมูล" });
  });

  it("shows the not-found text on a server error", async () => {
    server.use(http.get(DETAIL_URL, () => new HttpResponse(null, { status: 500 })));
    await renderPage();

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
  });
});

describe("VendorDetailPage — content", () => {
  it("shows a company vendor: name, email, account link, status, breadcrumb", async () => {
    serveVendor(companyVendor({ user: { id: 10, username: "vendor01", email: "vendor01@example.com" } }));
    await renderPage();

    // header ซ้ำสองชุด (มือถือ / sm ขึ้นไป) ซ่อนด้วย CSS
    expect((await heading()).map((h) => h.textContent)).toEqual([COMPANY_NAME, COMPANY_NAME]);
    expect(screen.getAllByText(/vendor01@example\.com/)).toHaveLength(2);
    for (const link of screen.getAllByRole("link", { name: "ดูบัญชีผู้ใช้" })) {
      expect(link).toHaveAttribute("href", "/dashboard/users/detail?id=10");
    }
    // badge ซ้ำสองชุด (header มือถือ / sm ขึ้นไป); สถานะ pending จึงไม่มีปุ่ม "รอตรวจสอบ" ใน bottom bar
    const badges = document.querySelectorAll('[data-slot="badge"]');
    const statusBadges = Array.from(badges).filter((el) => el.textContent === "รอตรวจสอบ");
    expect(statusBadges).toHaveLength(2);
    expect(within(bottomBar()).queryByRole("button", { name: "รอตรวจสอบ" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ข้อมูลผู้ค้า" })).toBeInTheDocument();
    expect(screen.getByText("ชื่อบริษัท / นิติบุคคล")).toBeInTheDocument();
    expect(useBreadcrumbStore.getState().items).toEqual([
      { label: "ผู้ค้าที่ลงทะเบียน", href: "/dashboard/vendors" },
      { label: COMPANY_NAME },
    ]);
  });

  it("shows an individual vendor by store name, with the individual fields and documents", async () => {
    serveVendor(
      makeVendorDetail({
        ...makeIndividualVendorProfile({ id: 7, detail: { storeName: "ร้านสมชาย" } }),
      }),
    );
    await renderPage();

    expect((await heading()).map((h) => h.textContent)).toEqual(["ร้านสมชาย", "ร้านสมชาย"]);
    expect(screen.getByText("ชื่อร้านค้า")).toBeInTheDocument();
    expect(screen.getByText("เลขบัตรประชาชน")).toBeInTheDocument();
    expect(screen.getByText("สำเนาบัตรประชาชน")).toBeInTheDocument();
    expect(screen.getByText("ทะเบียนพาณิชย์ (ถ้ามี)")).toBeInTheDocument();
    expect(screen.queryByText("หนังสือรับรองบริษัท")).not.toBeInTheDocument();
    expect(useBreadcrumbStore.getState().items.at(-1)).toEqual({ label: "ร้านสมชาย" });
  });

  it("omits the account link when the vendor has no user", async () => {
    serveVendor(companyVendor({ user: undefined }));
    await renderPage();

    await heading();
    expect(screen.queryByRole("link", { name: "ดูบัญชีผู้ใช้" })).not.toBeInTheDocument();
  });

  it("lists the required documents for the type, matching each uploaded file by type", async () => {
    serveVendor(
      companyVendor({
        document: [
          makeVendorDocument({ id: 31, documentType: "vat_registration", fileName: "vat.pdf", status: "approved" }),
        ],
      }),
    );
    await renderPage();

    await heading();
    expect(screen.getByRole("heading", { name: "เอกสาร" })).toBeInTheDocument();
    for (const label of [
      "หนังสือรับรองบริษัท",
      "สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ",
      "ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20)",
      "บัญชีรายชื่อผู้ถือหุ้น (บอจ.5)",
      "งบการเงิน / หนังสือรับรองฐานะการเงิน",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("vat.pdf")).toBeInTheDocument();
    expect(screen.getAllByText("ยังไม่มีเอกสาร")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "ดูไฟล์ ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20)" })).toHaveAttribute(
      "href",
      "http://localhost:3000/api/v1/vendor/document/31/view",
    );
  });

  it("shows contacts with the main contact first and formatted phone", async () => {
    serveVendor(
      companyVendor({
        contact: [
          makeVendorContact({ id: 1, contactName: "รอง คนที่สอง", contactPosition: "เลขา", contactPhone: "", contactEmail: "", lineId: "", isMainContact: false as unknown as string }),
          makeVendorContact({
            id: 2,
            contactName: "หลัก คนแรก",
            contactPosition: "",
            contactPhone: "0812345678",
            contactEmail: "main@example.com",
            lineId: "mainline",
            otherContact: "โทรหลัง 5 โมง",
            isMainContact: true as unknown as string,
          }),
        ],
      }),
    );
    await renderPage();

    await heading();
    expect(screen.getByRole("heading", { name: "ผู้ติดต่อ" })).toBeInTheDocument();
    const names = screen.getAllByText(/^(หลัก คนแรก|รอง คนที่สอง)$/).map((el) => el.textContent);
    // หลักมาก่อน: ชื่อ + ตำแหน่ง(ว่าง -> ใช้ชื่อแทน) แล้วจึงถึงรอง
    expect(names).toEqual(["หลัก คนแรก", "หลัก คนแรก", "รอง คนที่สอง"]);
    expect(screen.getAllByText("ผู้ติดต่อหลัก")).toHaveLength(1);
    expect(screen.getByText(/081-234-5678/)).toBeInTheDocument();
    expect(screen.getByText(/main@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/mainline/)).toBeInTheDocument();
    expect(screen.getByText(/โทรหลัง 5 โมง/)).toBeInTheDocument();
    expect(screen.getByText("เลขา")).toBeInTheDocument();
  });

  it("shows an empty message when the vendor has no contacts", async () => {
    serveVendor(companyVendor({ contact: [] }));
    await renderPage();

    await heading();
    expect(screen.getByText("ยังไม่มีผู้ติดต่อ")).toBeInTheDocument();
  });

  it("shows the vendor rejection reason in both header layouts when rejected", async () => {
    serveVendor(companyVendor({ verificationStatus: "rejected", remark: "เอกสารไม่ครบ" }));
    await renderPage();

    await heading();
    expect(screen.getByText("เหตุผลที่ปฏิเสธ")).toBeInTheDocument();
    expect(screen.getAllByText(/เอกสารไม่ครบ/)).toHaveLength(2);
    expect(screen.getByText("เหตุผล: เอกสารไม่ครบ")).toBeInTheDocument();
  });

  it("shows no vendor reason when rejected without a remark or when not rejected", async () => {
    serveVendor(companyVendor({ verificationStatus: "rejected", remark: undefined }));
    await renderPage();

    await heading();
    expect(screen.queryByText("เหตุผลที่ปฏิเสธ")).not.toBeInTheDocument();
    expect(screen.queryByText(/เหตุผล:/)).not.toBeInTheDocument();
  });
});

describe("VendorDetailPage — vendor action buttons", () => {
  it.each([
    ["pending", ["อนุมัติผู้ค้า", "ปฏิเสธผู้ค้า"], ["รอตรวจสอบ"]],
    ["approved", ["รอตรวจสอบ", "ปฏิเสธผู้ค้า"], ["อนุมัติผู้ค้า"]],
    ["rejected", ["รอตรวจสอบ", "อนุมัติผู้ค้า"], ["ปฏิเสธผู้ค้า"]],
  ] as const)("%s: shows the allowed actions in the bottom bar", async (status, shown, hidden) => {
    serveVendor(companyVendor({ verificationStatus: status }));
    await renderPage();

    await heading();
    const bar = within(bottomBar());
    for (const name of shown) expect(bar.getByRole("button", { name })).toBeInTheDocument();
    for (const name of hidden) expect(bar.queryByRole("button", { name })).not.toBeInTheDocument();
    expect(bar.getByRole("button", { name: "ลบผู้ค้า" })).toBeInTheDocument();
  });
});

describe("VendorDetailPage — approve", () => {
  it("approves, toasts, and refreshes the status", async () => {
    const { actions } = serveVendor(companyVendor({ verificationStatus: "pending" }));
    const { user } = await renderPage();
    await heading();

    await user.click(within(bottomBar()).getByRole("button", { name: "อนุมัติผู้ค้า" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("อนุมัติผู้ค้าสำเร็จ"));
    expect(actions).toEqual([{ id: "7", action: "approve", body: {} }]);
    await waitFor(() =>
      expect(within(bottomBar()).queryByRole("button", { name: "อนุมัติผู้ค้า" })).not.toBeInTheDocument(),
    );
    expect(within(bottomBar()).getByRole("button", { name: "รอตรวจสอบ" })).toBeInTheDocument();
  });

  it("shows the backend message when approving fails", async () => {
    serveVendor(companyVendor());
    server.use(http.post(ACTION_URL, () => HttpResponse.json({ message: "เอกสารยังไม่ผ่าน" }, { status: 422 })));
    const { user } = await renderPage();
    await heading();

    await user.click(screen.getByRole("button", { name: "อนุมัติผู้ค้า" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เอกสารยังไม่ผ่าน"));
  });

  it("falls back to a generic message when approving fails without a message", async () => {
    serveVendor(companyVendor());
    server.use(http.post(ACTION_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = await renderPage();
    await heading();

    await user.click(screen.getByRole("button", { name: "อนุมัติผู้ค้า" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("disables all vendor actions and shows progress text while approving", async () => {
    serveVendor(companyVendor());
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(ACTION_URL, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderPage();
    await heading();

    await user.click(screen.getByRole("button", { name: "อนุมัติผู้ค้า" }));

    await waitFor(() => expect(within(bottomBar()).getByRole("button", { name: "กำลังดำเนินการ..." })).toBeDisabled());
    expect(within(bottomBar()).getByRole("button", { name: "ปฏิเสธผู้ค้า" })).toBeDisabled();
    expect(within(bottomBar()).getByRole("button", { name: "ลบผู้ค้า" })).toBeDisabled();
    release();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("อนุมัติผู้ค้าสำเร็จ"));
  });
});

describe("VendorDetailPage — set pending", () => {
  it("sends the vendor back to pending, toasts and refreshes", async () => {
    const { actions } = serveVendor(companyVendor({ verificationStatus: "approved" }));
    const { user } = await renderPage();
    await heading();

    await user.click(within(bottomBar()).getByRole("button", { name: "รอตรวจสอบ" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ส่งกลับไปรอตรวจสอบแล้ว"));
    expect(actions).toEqual([{ id: "7", action: "pending", body: undefined }]);
    await waitFor(() =>
      expect(within(bottomBar()).queryByRole("button", { name: "รอตรวจสอบ" })).not.toBeInTheDocument(),
    );
    expect(within(bottomBar()).getByRole("button", { name: "อนุมัติผู้ค้า" })).toBeInTheDocument();
  });

  it("shows the backend message when it fails", async () => {
    serveVendor(companyVendor({ verificationStatus: "approved" }));
    server.use(http.post(ACTION_URL, () => HttpResponse.json({ message: "ย้อนกลับไม่ได้" }, { status: 422 })));
    const { user } = await renderPage();
    await heading();

    await user.click(screen.getByRole("button", { name: "รอตรวจสอบ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ย้อนกลับไม่ได้"));
  });

  it("falls back to a generic message when it fails without a message", async () => {
    serveVendor(companyVendor({ verificationStatus: "approved" }));
    server.use(http.post(ACTION_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = await renderPage();
    await heading();

    await user.click(screen.getByRole("button", { name: "รอตรวจสอบ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });
});

describe("VendorDetailPage — reject", () => {
  async function openRejectDialog(user: ReturnType<typeof userEvent.setup>) {
    await user.click(within(bottomBar()).getByRole("button", { name: "ปฏิเสธผู้ค้า" }));
    return screen.findByRole("dialog");
  }

  it("opens a dialog naming the vendor and requires a reason", async () => {
    serveVendor(companyVendor());
    const { user } = await renderPage();
    await heading();

    const dialog = await openRejectDialog(user);

    expect(dialog).toHaveTextContent(`ระบุเหตุผลที่ปฏิเสธ "${COMPANY_NAME}"`);
    expect(within(dialog).getByRole("button", { name: "ยืนยันปฏิเสธ" })).toBeDisabled();
  });

  it("rejects with the trimmed reason, toasts, closes and refreshes with the reason", async () => {
    const { actions } = serveVendor(companyVendor());
    const { user } = await renderPage();
    await heading();
    const dialog = await openRejectDialog(user);

    await user.type(within(dialog).getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ"), "  เอกสารปลอม ");
    await user.click(within(dialog).getByRole("button", { name: "ยืนยันปฏิเสธ" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ปฏิเสธผู้ค้าสำเร็จ"));
    expect(actions).toEqual([{ id: "7", action: "reject", body: { remark: "เอกสารปลอม" } }]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("เหตุผล: เอกสารปลอม")).toBeInTheDocument();
    expect(within(bottomBar()).queryByRole("button", { name: "ปฏิเสธผู้ค้า" })).not.toBeInTheDocument();
  });

  it("sends nothing when the reject dialog is dismissed", async () => {
    const { actions } = serveVendor(companyVendor());
    const { user } = await renderPage();
    await heading();
    const dialog = await openRejectDialog(user);
    await user.type(within(dialog).getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ"), "เหตุผล");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(actions).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("shows the backend message when rejecting fails", async () => {
    serveVendor(companyVendor());
    server.use(http.post(ACTION_URL, () => HttpResponse.json({ message: "ปฏิเสธไม่ได้" }, { status: 422 })));
    const { user } = await renderPage();
    await heading();
    const dialog = await openRejectDialog(user);

    await user.type(within(dialog).getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ"), "เหตุผล");
    await user.click(within(dialog).getByRole("button", { name: "ยืนยันปฏิเสธ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ปฏิเสธไม่ได้"));
  });

  it("falls back to a generic message when rejecting fails without a message", async () => {
    serveVendor(companyVendor());
    server.use(http.post(ACTION_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = await renderPage();
    await heading();
    const dialog = await openRejectDialog(user);

    await user.type(within(dialog).getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ"), "เหตุผล");
    await user.click(within(dialog).getByRole("button", { name: "ยืนยันปฏิเสธ" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("disables the vendor actions and shows progress text while rejecting", async () => {
    serveVendor(companyVendor());
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(ACTION_URL, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderPage();
    await heading();
    const dialog = await openRejectDialog(user);

    await user.type(within(dialog).getByPlaceholderText("ระบุเหตุผลที่ปฏิเสธ"), "เหตุผล");
    await user.click(within(dialog).getByRole("button", { name: "ยืนยันปฏิเสธ" }));

    await waitFor(() => expect(within(bottomBar()).getByRole("button", { name: "กำลังดำเนินการ..." })).toBeDisabled());
    expect(within(bottomBar()).getByRole("button", { name: "อนุมัติผู้ค้า" })).toBeDisabled();
    release();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ปฏิเสธผู้ค้าสำเร็จ"));
  });
});

describe("VendorDetailPage — delete", () => {
  it("asks for confirmation with the vendor name from the bottom bar", async () => {
    serveVendor(companyVendor());
    const { user } = await renderPage();
    await heading();

    await user.click(within(bottomBar()).getByRole("button", { name: "ลบผู้ค้า" }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent(`ต้องการลบผู้ค้า "${COMPANY_NAME}" ใช่หรือไม่?`);
  });

  it("deletes the vendor, toasts and redirects to the vendor list", async () => {
    const deleted = vi.fn();
    serveVendor(companyVendor());
    server.use(
      http.delete(DETAIL_URL, ({ params }) => {
        deleted(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderPage();
    await heading();

    await user.click(within(bottomBar()).getByRole("button", { name: "ลบผู้ค้า" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "ลบผู้ค้า" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ค้าสำเร็จ"));
    expect(deleted).toHaveBeenCalledWith("7");
    expect(router.push).toHaveBeenCalledWith("/dashboard/vendors");
  });

  it("closes without deleting or redirecting when cancelled", async () => {
    const deleted = vi.fn();
    serveVendor(companyVendor());
    server.use(
      http.delete(DETAIL_URL, () => {
        deleted();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderPage();
    await heading();

    await user.click(within(bottomBar()).getByRole("button", { name: "ลบผู้ค้า" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(deleted).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("disables the confirm button and sends a single request while deleting", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const deleted = vi.fn();
    serveVendor(companyVendor());
    server.use(
      http.delete(DETAIL_URL, async () => {
        deleted();
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderPage();
    await heading();

    await user.click(within(bottomBar()).getByRole("button", { name: "ลบผู้ค้า" }));
    const dialog = await screen.findByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "ลบผู้ค้า" });
    await user.click(confirm);

    await waitFor(() => expect(confirm).toBeDisabled());
    await user.click(confirm);
    expect(deleted).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard/vendors"));
    expect(deleted).toHaveBeenCalledTimes(1);
  });

  it("can be started from the mobile options menu", async () => {
    serveVendor(companyVendor());
    const { user } = await renderPage();
    await heading();

    await user.click(screen.getByRole("button", { name: "ตัวเลือกเพิ่มเติม" }));
    await user.click(await screen.findByRole("menuitem", { name: "ลบผู้ค้า" }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent(`ต้องการลบผู้ค้า "${COMPANY_NAME}" ใช่หรือไม่?`);
  });

  it("shows the backend message, stays on the page and does not redirect when deleting fails", async () => {
    serveVendor(companyVendor());
    server.use(http.delete(DETAIL_URL, () => HttpResponse.json({ message: "ลบไม่ได้" }, { status: 422 })));
    const { user } = await renderPage();
    await heading();

    await user.click(within(bottomBar()).getByRole("button", { name: "ลบผู้ค้า" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "ลบผู้ค้า" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบไม่ได้"));
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("falls back to the delete failure message when the backend sends none", async () => {
    serveVendor(companyVendor());
    server.use(http.delete(DETAIL_URL, () => new HttpResponse(null, { status: 500 })));
    const { user } = await renderPage();
    await heading();

    await user.click(within(bottomBar()).getByRole("button", { name: "ลบผู้ค้า" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "ลบผู้ค้า" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลบผู้ค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
  });
});

describe("VendorDetailPage — permissions", () => {
  const DOCUMENT = makeVendorDocument({ id: 55, documentType: "company_certificate", status: "pending" });
  const VENDOR_BUTTONS = ["อนุมัติผู้ค้า", "ปฏิเสธผู้ค้า", "รอตรวจสอบ", "ลบผู้ค้า"];
  const DOCUMENT_BUTTONS = ["อนุมัติ", "ปฏิเสธ"];

  it("shows Forbidden and sends no detail request without vendors.viewAny", async () => {
    const { state } = serveVendor(companyVendor());
    await renderPage("/dashboard/vendors/detail?id=7", { permissions: ["vendors.review", "vendors.delete"] });

    expect(await screen.findByText("คุณไม่มีสิทธิ์เข้าถึงหน้านี้")).toBeInTheDocument();
    expect(screen.queryByText(COMPANY_NAME)).not.toBeInTheDocument();
    expect(bottomBar()).toBeNull();
    expect(state.detailRequests).toEqual([]);
  });

  it.each(["pending", "approved", "rejected"] as const)(
    "with only vendors.viewAny a %s vendor has no actions, no bottom bar, no options menu and no document actions",
    async (status) => {
      serveVendor(companyVendor({ verificationStatus: status, document: [DOCUMENT] }));
      await renderPage("/dashboard/vendors/detail?id=7", { permissions: ["vendors.viewAny"] });
      await heading();

      expect(bottomBar()).toBeNull();
      for (const name of [...VENDOR_BUTTONS, ...DOCUMENT_BUTTONS]) {
        expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
      }
      expect(screen.queryByRole("button", { name: "ตัวเลือกเพิ่มเติม" })).not.toBeInTheDocument();
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      // ยังดูเอกสารได้
      expect(screen.getByRole("link", { name: "ดูไฟล์ หนังสือรับรองบริษัท" })).toBeInTheDocument();
    },
  );

  it("with vendors.review but not vendors.delete shows the status buttons and document actions but no delete", async () => {
    serveVendor(companyVendor({ verificationStatus: "pending", document: [DOCUMENT] }));
    await renderPage("/dashboard/vendors/detail?id=7", { permissions: ["vendors.viewAny", "vendors.review"] });
    await heading();

    const bar = within(bottomBar());
    expect(bar.getByRole("button", { name: "อนุมัติผู้ค้า" })).toBeInTheDocument();
    expect(bar.getByRole("button", { name: "ปฏิเสธผู้ค้า" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ลบผู้ค้า" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ตัวเลือกเพิ่มเติม" })).not.toBeInTheDocument();
    for (const name of DOCUMENT_BUTTONS) expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it("with vendors.review but not vendors.delete offers back-to-pending for an approved vendor", async () => {
    serveVendor(companyVendor({ verificationStatus: "approved" }));
    await renderPage("/dashboard/vendors/detail?id=7", { permissions: ["vendors.viewAny", "vendors.review"] });
    await heading();

    expect(within(bottomBar()).getByRole("button", { name: "รอตรวจสอบ" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ลบผู้ค้า" })).not.toBeInTheDocument();
  });

  it("with vendors.delete but not vendors.review shows delete and the options menu but no status buttons or document actions", async () => {
    serveVendor(companyVendor({ verificationStatus: "pending", document: [DOCUMENT] }));
    await renderPage("/dashboard/vendors/detail?id=7", { permissions: ["vendors.viewAny", "vendors.delete"] });
    await heading();

    expect(within(bottomBar()).getByRole("button", { name: "ลบผู้ค้า" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ตัวเลือกเพิ่มเติม" })).toBeInTheDocument();
    for (const name of ["อนุมัติผู้ค้า", "ปฏิเสธผู้ค้า", "รอตรวจสอบ", ...DOCUMENT_BUTTONS]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});

describe("VendorDetailPage — document actions", () => {
  it("wires each document row to its own document and vendor", async () => {
    const { state } = serveVendor(
      companyVendor({
        document: [makeVendorDocument({ id: 55, documentType: "company_certificate", status: "pending" })],
      }),
    );
    const docCalls: string[] = [];
    server.use(
      http.post(apiUrl("/api/v1/vendors/:vendorId/documents/:documentId/:action"), ({ params }) => {
        docCalls.push(`${params.vendorId}/${params.documentId}/${params.action}`);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderPage();
    await heading();

    // ปุ่ม "อนุมัติ" ปุ่มเดียวมาจากแถวเอกสาร (ปุ่มของผู้ค้าชื่อ "อนุมัติผู้ค้า")
    await user.click(screen.getByRole("button", { name: "อนุมัติ" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("อนุมัติเอกสารสำเร็จ"));
    expect(docCalls).toEqual(["7/55/approve"]);
    // หลัง action ต้อง refetch รายละเอียดผู้ค้า (initial + invalidate)
    await waitFor(() => expect(state.detailRequests).toEqual(["7", "7"]));
  });
});
