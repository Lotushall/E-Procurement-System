import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import IndividualInfoForm from "@/app/(public)/profiles/vendor-info/_components/individual-info-form";
import type { VendorProfile } from "@/lib/vendor/profile/types";
import { makeIndividualVendorProfile } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

type IndividualDetail = Extract<VendorProfile["detail"], { type: "individual" }>;

const INFO_URL = apiUrl("/api/v1/vendor/info");
const FALLBACK = "บันทึกข้อมูลกิจการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

function detailOf(overrides: Partial<IndividualDetail> = {}): IndividualDetail {
  return makeIndividualVendorProfile({ detail: overrides }).detail as IndividualDetail;
}

// InputField ไม่ได้ผูก <label> กับ input (เป็น <p>) จึงหากลุ่มจากข้อความ label
function box(label: string): HTMLElement {
  const wrapper = screen.getByText(label).closest("div.flex-col");
  if (!wrapper) throw new Error(`field not found for label ${label}`);
  return wrapper as HTMLElement;
}

function field(label: string): HTMLInputElement {
  const input = box(label).querySelector("input");
  if (!input) throw new Error(`input not found for label ${label}`);
  return input;
}

function hasWarning(label: string): boolean {
  return box(label).querySelector("span.rounded-full") !== null;
}

function renderForm(overrides: Partial<IndividualDetail> = {}) {
  return renderWithQueryClient(<IndividualInfoForm detail={detailOf(overrides)} />);
}

async function replace(label: string, text: string) {
  const user = userEvent.setup();
  await user.clear(field(label));
  if (text) await user.type(field(label), text);
  // mode: "onBlur" — ตรวจสอบเมื่อออกจากช่อง; หลังมี error ปุ่มบันทึกจะถูก disable
  await user.tab();
}

function serveInfo(status = 204) {
  const bodies: unknown[] = [];
  server.use(
    http.post(INFO_URL, async ({ request }) => {
      bodies.push(await request.json());
      return new HttpResponse(null, { status });
    }),
  );
  return bodies;
}

const save = () => userEvent.setup().click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));

const FIELD_LABELS = [
  "ชื่อร้านค้า",
  "ประเภทธุรกิจ",
  "ชื่อ",
  "นามสกุล",
  "เลขบัตรประชาชน",
  "ที่อยู่",
  "จังหวัด",
  "รหัสไปรษณีย์",
];

describe("IndividualInfoForm", () => {
  it("prefills every field from the profile", () => {
    renderForm();

    expect(field("ชื่อร้านค้า")).toHaveValue("ร้านตัวอย่าง");
    expect(field("ชื่อ")).toHaveValue("สมชาย");
    expect(field("นามสกุล")).toHaveValue("ใจดี");
    expect(field("เลขบัตรประชาชน")).toHaveValue("1-1017-00000-00-1");
    expect(field("เลขผู้เสียภาษี (ถ้ามี)")).toHaveValue("1-1017-00000-00-1");
    expect(field("ที่อยู่")).toHaveValue("2 ถนนพหลโยธิน");
    expect(field("รหัสไปรษณีย์")).toHaveValue("10400");
    expect(within(box("ประเภทธุรกิจ")).getByRole("combobox")).toHaveTextContent("ซื้อขาย");
    expect(within(box("คำนำหน้า")).getByRole("combobox")).toHaveTextContent("นาย");
    expect(within(box("จังหวัด")).getByRole("combobox")).toHaveTextContent("กรุงเทพมหานคร");
  });

  it("shows masked ids formatted", () => {
    renderForm({ citizenId: "xxxxxxxxx1234", taxId: "xxxxxxxxx5678" });

    expect(field("เลขบัตรประชาชน")).toHaveValue("X-XXXX-XXXX1-23-4");
    expect(field("เลขผู้เสียภาษี (ถ้ามี)")).toHaveValue("X-XXXX-XXXX5-67-8");
  });

  it("shows no warning dots when everything is filled", () => {
    renderForm();

    for (const label of FIELD_LABELS) expect(hasWarning(label)).toBe(false);
  });

  it("flags each empty field with a warning dot", () => {
    renderForm({
      storeName: "",
      businessType: "",
      firstname: "",
      lastname: "",
      citizenId: "",
      taxId: "",
      address: "",
      province: "",
      postalCode: "",
    });

    for (const label of FIELD_LABELS) expect(hasWarning(label)).toBe(true);
    // เลขผู้เสียภาษีเป็นฟิลด์ไม่บังคับ จึงไม่มีจุดเตือน
    expect(hasWarning("เลขผู้เสียภาษี (ถ้ามี)")).toBe(false);
  });

  it("defaults the prefix to นาย when the profile has none", async () => {
    const bodies = serveInfo();
    renderForm({ prefix: "" });

    expect(within(box("คำนำหน้า")).getByRole("combobox")).toHaveTextContent("นาย");
    await save();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลกิจการสำเร็จ"));
    expect(bodies[0]).toMatchObject({ prefix: "นาย" });
  });

  it("keeps the profile prefix when it has one", () => {
    renderForm({ prefix: "นางสาว" });

    expect(within(box("คำนำหน้า")).getByRole("combobox")).toHaveTextContent("นางสาว");
  });

  it("lets the user pick another prefix", async () => {
    const user = userEvent.setup();
    const bodies = serveInfo();
    renderForm();

    await user.click(within(box("คำนำหน้า")).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "นางสาว" }));
    await save();

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ prefix: "นางสาว" });
  });

  it("saves untouched masked ids unchanged and adds vendorType", async () => {
    const bodies = serveInfo();
    renderForm({ citizenId: "xxxxxxxxx1234", taxId: "xxxxxxxxx5678" });

    await save();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลกิจการสำเร็จ"));
    expect(bodies).toEqual([
      {
        vendorType: "individual",
        storeName: "ร้านตัวอย่าง",
        businessType: "ซื้อขาย",
        prefix: "นาย",
        firstname: "สมชาย",
        lastname: "ใจดี",
        citizenId: "xxxxxxxxx1234",
        taxId: "xxxxxxxxx5678",
        address: "2 ถนนพหลโยธิน",
        province: "กรุงเทพมหานคร",
        postalCode: "10400",
      },
    ]);
  });

  it("sends edited values with valid ids", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("ชื่อร้านค้า", "ร้านใหม่");
    await replace("เลขบัตรประชาชน", "1103700012346");
    await replace("เลขผู้เสียภาษี (ถ้ามี)", "1103700012346");
    await save();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลกิจการสำเร็จ"));
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      vendorType: "individual",
      storeName: "ร้านใหม่",
      citizenId: "1-1037-00012-34-6",
      taxId: "1-1037-00012-34-6",
    });
  });

  it("allows saving without a tax id", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("เลขผู้เสียภาษี (ถ้ามี)", "");
    await save();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลกิจการสำเร็จ"));
    expect(bodies[0]).toMatchObject({ taxId: "" });
  });

  it("blocks submit and shows messages for empty required fields", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("ชื่อร้านค้า", "");
    await replace("ชื่อ", "");
    await replace("นามสกุล", "");
    await replace("เลขบัตรประชาชน", "");
    await replace("ที่อยู่", "");
    await replace("รหัสไปรษณีย์", "");

    expect(await screen.findByText("กรุณากรอกชื่อร้านค้า")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกชื่อ")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกนามสกุล")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกเลขบัตรประชาชน")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกที่อยู่")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกรหัสไปรษณีย์")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "บันทึกข้อมูล" })).toBeDisabled();
    expect(bodies).toEqual([]);
  });

  it("blocks submit when the postal code is not 5 digits", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("รหัสไปรษณีย์", "1040");
    await save();

    expect(await screen.findByText("รหัสไปรษณีย์ต้องมี 5 หลัก")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("blocks submit when an id does not have 13 digits", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("เลขบัตรประชาชน", "110370001");
    await replace("เลขผู้เสียภาษี (ถ้ามี)", "1103");
    await save();

    expect(await screen.findByText("เลขบัตรประชาชนต้องมี 13 หลัก")).toBeInTheDocument();
    expect(screen.getByText("เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("blocks submit when an id has a wrong check digit", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("เลขบัตรประชาชน", "1103700012345");
    await replace("เลขผู้เสียภาษี (ถ้ามี)", "1103700012345");
    await save();

    expect(await screen.findByText("เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง")).toBeInTheDocument();
    expect(screen.getByText("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("formats the id as the user types and strips other characters", async () => {
    renderForm();

    await replace("เลขบัตรประชาชน", "11a03-7000");

    expect(field("เลขบัตรประชาชน")).toHaveValue("1-1037-000");
  });

  it("puts 422 field errors on the fields and toasts a generic message", async () => {
    server.use(
      http.post(INFO_URL, () =>
        HttpResponse.json(
          {
            message: "invalid",
            errors: { citizenId: ["เลขบัตรประชาชนนี้ถูกใช้แล้ว"], storeName: ["ชื่อร้านซ้ำ", "อื่น"] },
          },
          { status: 422 },
        ),
      ),
    );
    renderForm();

    await save();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(within(box("เลขบัตรประชาชน")).getByText("เลขบัตรประชาชนนี้ถูกใช้แล้ว")).toBeInTheDocument();
    expect(within(box("ชื่อร้านค้า")).getByText("ชื่อร้านซ้ำ")).toBeInTheDocument();
    expect(screen.queryByText("อื่น")).not.toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("toasts the backend message on other failures", async () => {
    server.use(http.post(INFO_URL, () => HttpResponse.json({ message: "เซิร์ฟเวอร์ขัดข้อง" }, { status: 500 })));
    renderForm();

    await save();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เซิร์ฟเวอร์ขัดข้อง"));
  });

  it("falls back to the Thai default when the failure has no message", async () => {
    server.use(http.post(INFO_URL, () => new HttpResponse(null, { status: 500 })));
    renderForm();

    await save();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("falls back to the Thai default for a 422 without an errors object", async () => {
    server.use(http.post(INFO_URL, () => HttpResponse.json({}, { status: 422 })));
    renderForm();

    await save();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(FALLBACK));
  });

  it("disables both buttons and shows progress while saving", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(INFO_URL, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderForm();

    await save();

    expect(await screen.findByRole("button", { name: "กำลังบันทึก..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "รีเช็ต" })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByRole("button", { name: "บันทึกข้อมูล" })).toBeEnabled());
  });

  // base-ui ถือว่า "" คือมีค่าที่เลือกแล้ว (เฉพาะ null เท่านั้นที่แสดง placeholder) แต่ฟอร์มส่ง "" เมื่อยังไม่เลือก
  it.skip("BUG: empty province (\"\") shows a blank trigger instead of the placeholder — app/(public)/profiles/vendor-info/_components/individual-info-form.tsx:133", () => {
    renderForm({ province: "" });

    expect(within(box("จังหวัด")).getByRole("combobox")).toHaveTextContent("เลือกจังหวัด");
  });

  it("lets the user pick another province and sends it", async () => {
    const user = userEvent.setup();
    const bodies = serveInfo();
    renderForm();

    await user.click(within(box("จังหวัด")).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "เชียงใหม่" }));
    expect(within(box("จังหวัด")).getByRole("combobox")).toHaveTextContent("เชียงใหม่");
    await save();

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toMatchObject({ province: "เชียงใหม่" });
  });

  it("restores the profile values when reset is clicked", async () => {
    const user = userEvent.setup();
    renderForm();

    await replace("ชื่อร้านค้า", "ชื่อที่แก้");
    await replace("เลขบัตรประชาชน", "1103700012346");
    await replace("รหัสไปรษณีย์", "99999");
    await user.click(screen.getByRole("button", { name: "รีเช็ต" }));

    expect(field("ชื่อร้านค้า")).toHaveValue("ร้านตัวอย่าง");
    expect(field("เลขบัตรประชาชน")).toHaveValue("1-1017-00000-00-1");
    expect(field("รหัสไปรษณีย์")).toHaveValue("10400");
  });

  it("clears validation errors on reset and re-enables save", async () => {
    const user = userEvent.setup();
    renderForm();

    await replace("รหัสไปรษณีย์", "1");
    expect(await screen.findByText("รหัสไปรษณีย์ต้องมี 5 หลัก")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "บันทึกข้อมูล" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "รีเช็ต" }));

    await waitFor(() => expect(screen.queryByText("รหัสไปรษณีย์ต้องมี 5 หลัก")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "บันทึกข้อมูล" })).toBeEnabled();
  });

  it("does not call the API when validation fails on submit", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(INFO_URL, spy));
    renderForm({ address: "" });

    await save();

    expect(await screen.findByText("กรุณากรอกที่อยู่")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});
