import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import CompanyInfoForm from "@/app/(public)/profiles/vendor-info/_components/company-info-form";
import type { VendorProfile } from "@/lib/vendor/profile/types";
import { makeCompanyVendorProfile } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

type CompanyDetail = Extract<VendorProfile["detail"], { type: "company" }>;

const INFO_URL = apiUrl("/api/v1/vendor/info");
const FALLBACK = "บันทึกข้อมูลกิจการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

function detailOf(overrides: Partial<CompanyDetail> = {}): CompanyDetail {
  return makeCompanyVendorProfile({ detail: overrides }).detail as CompanyDetail;
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

function renderForm(overrides: Partial<CompanyDetail> = {}) {
  return renderWithQueryClient(<CompanyInfoForm detail={detailOf(overrides)} />);
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

describe("CompanyInfoForm", () => {
  it("prefills every field from the profile", () => {
    renderForm();

    expect(field("ชื่อบริษัท / นิติบุคคล")).toHaveValue("บริษัท ตัวอย่าง จำกัด");
    expect(field("สาขา")).toHaveValue("00000");
    expect(field("เลขทะเบียนนิติบุคคล")).toHaveValue("0-1055-00000-00-3");
    expect(field("เลขผู้เสียภาษี")).toHaveValue("0-1055-00000-00-3");
    expect(field("ที่อยู่")).toHaveValue("1 ถนนสุขุมวิท");
    expect(field("รหัสไปรษณีย์")).toHaveValue("10110");
    expect(within(box("ประเภทธุรกิจ")).getByRole("combobox")).toHaveTextContent("ซื้อขาย");
    expect(within(box("จังหวัด")).getByRole("combobox")).toHaveTextContent("กรุงเทพมหานคร");
  });

  it("shows masked ids formatted", () => {
    renderForm({ businessRegistrationNo: "xxxxxxxxx1234", taxId: "xxxxxxxxx5678" });

    expect(field("เลขทะเบียนนิติบุคคล")).toHaveValue("X-XXXX-XXXX1-23-4");
    expect(field("เลขผู้เสียภาษี")).toHaveValue("X-XXXX-XXXX5-67-8");
  });

  it("shows no warning dots when everything is filled", () => {
    renderForm();

    for (const label of [
      "ชื่อบริษัท / นิติบุคคล",
      "ประเภทธุรกิจ",
      "เลขทะเบียนนิติบุคคล",
      "เลขผู้เสียภาษี",
      "ที่อยู่",
      "จังหวัด",
      "รหัสไปรษณีย์",
    ]) {
      expect(hasWarning(label)).toBe(false);
    }
  });

  it("flags each empty field with a warning dot", () => {
    renderForm({
      companyName: "",
      businessType: "",
      businessRegistrationNo: "",
      taxId: "",
      address: "",
      province: "",
      postalCode: "",
    });

    for (const label of [
      "ชื่อบริษัท / นิติบุคคล",
      "ประเภทธุรกิจ",
      "เลขทะเบียนนิติบุคคล",
      "เลขผู้เสียภาษี",
      "ที่อยู่",
      "จังหวัด",
      "รหัสไปรษณีย์",
    ]) {
      expect(hasWarning(label)).toBe(true);
    }
    // สาขาเป็นฟิลด์ไม่บังคับ จึงไม่มีจุดเตือน
    expect(hasWarning("สาขา")).toBe(false);
  });

  it("saves untouched masked ids unchanged and adds vendorType", async () => {
    const bodies = serveInfo();
    renderForm({ businessRegistrationNo: "xxxxxxxxx1234", taxId: "xxxxxxxxx5678" });

    await save();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลกิจการสำเร็จ"));
    expect(bodies).toEqual([
      {
        vendorType: "company",
        companyName: "บริษัท ตัวอย่าง จำกัด",
        businessType: "ซื้อขาย",
        branchNo: "00000",
        businessRegistrationNo: "xxxxxxxxx1234",
        taxId: "xxxxxxxxx5678",
        address: "1 ถนนสุขุมวิท",
        province: "กรุงเทพมหานคร",
        postalCode: "10110",
      },
    ]);
  });

  it("sends edited values with valid ids", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("ชื่อบริษัท / นิติบุคคล", "บริษัท ใหม่ จำกัด");
    await replace("เลขทะเบียนนิติบุคคล", "0105512345671");
    await replace("เลขผู้เสียภาษี", "0105512345671");
    await replace("รหัสไปรษณีย์", "50000");
    expect(field("เลขทะเบียนนิติบุคคล")).toHaveValue("0-1055-12345-67-1");
    await save();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("บันทึกข้อมูลกิจการสำเร็จ"));
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({
      vendorType: "company",
      companyName: "บริษัท ใหม่ จำกัด",
      businessRegistrationNo: "0-1055-12345-67-1",
      taxId: "0-1055-12345-67-1",
      postalCode: "50000",
    });
  });

  it("blocks submit and shows messages for empty required fields", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("ชื่อบริษัท / นิติบุคคล", "");
    await replace("เลขทะเบียนนิติบุคคล", "");
    await replace("เลขผู้เสียภาษี", "");
    await replace("ที่อยู่", "");
    await replace("รหัสไปรษณีย์", "");
    await save();

    expect(await screen.findByText("กรุณากรอกชื่อบริษัท / นิติบุคคล")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกเลขทะเบียนนิติบุคคล")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกเลขผู้เสียภาษี")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกที่อยู่")).toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกรหัสไปรษณีย์")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("blocks submit when the postal code is not 5 digits", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("รหัสไปรษณีย์", "1011");
    await save();

    expect(await screen.findByText("รหัสไปรษณีย์ต้องมี 5 หลัก")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("blocks submit when an id does not have 13 digits", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("เลขทะเบียนนิติบุคคล", "010551234");
    await replace("เลขผู้เสียภาษี", "0105512");
    await save();

    expect(await screen.findByText("เลขทะเบียนนิติบุคคลต้องมี 13 หลัก")).toBeInTheDocument();
    expect(screen.getByText("เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("blocks submit when an id has a wrong check digit", async () => {
    const bodies = serveInfo();
    renderForm();

    await replace("เลขทะเบียนนิติบุคคล", "0105512345678");
    await replace("เลขผู้เสียภาษี", "0105512345678");
    await save();

    expect(
      await screen.findByText("เลขทะเบียนนิติบุคคลไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง"),
    ).toBeInTheDocument();
    expect(screen.getByText("เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง")).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("formats the id as the user types and strips other characters", async () => {
    renderForm();

    await replace("เลขผู้เสียภาษี", "01a05-5123");

    expect(field("เลขผู้เสียภาษี")).toHaveValue("0-1055-123");
  });

  it("puts 422 field errors on the fields and toasts a generic message", async () => {
    server.use(
      http.post(INFO_URL, () =>
        HttpResponse.json(
          {
            message: "invalid",
            errors: {
              companyName: ["ชื่อบริษัทนี้ถูกใช้แล้ว"],
              taxId: ["เลขผู้เสียภาษีนี้ถูกใช้แล้ว"],
            },
          },
          { status: 422 },
        ),
      ),
    );
    renderForm();

    await save();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("กรุณาตรวจสอบข้อมูลที่กรอก"));
    expect(within(box("ชื่อบริษัท / นิติบุคคล")).getByText("ชื่อบริษัทนี้ถูกใช้แล้ว")).toBeInTheDocument();
    expect(within(box("เลขผู้เสียภาษี")).getByText("เลขผู้เสียภาษีนี้ถูกใช้แล้ว")).toBeInTheDocument();
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
  it.skip("BUG: empty province (\"\") shows a blank trigger instead of the placeholder — app/(public)/profiles/vendor-info/_components/company-info-form.tsx:104", () => {
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

    await replace("ชื่อบริษัท / นิติบุคคล", "ชื่อที่แก้");
    await replace("เลขผู้เสียภาษี", "0105512345671");
    await replace("รหัสไปรษณีย์", "99999");
    await user.click(screen.getByRole("button", { name: "รีเช็ต" }));

    expect(field("ชื่อบริษัท / นิติบุคคล")).toHaveValue("บริษัท ตัวอย่าง จำกัด");
    expect(field("เลขผู้เสียภาษี")).toHaveValue("0-1055-00000-00-3");
    expect(field("รหัสไปรษณีย์")).toHaveValue("10110");
  });

  it("clears validation errors on reset and re-enables save", async () => {
    const user = userEvent.setup();
    renderForm();

    await replace("รหัสไปรษณีย์", "1");
    await user.click(screen.getByRole("button", { name: "บันทึกข้อมูล" }));
    expect(await screen.findByText("รหัสไปรษณีย์ต้องมี 5 หลัก")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "บันทึกข้อมูล" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "รีเช็ต" }));

    await waitFor(() => expect(screen.queryByText("รหัสไปรษณีย์ต้องมี 5 หลัก")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "บันทึกข้อมูล" })).toBeEnabled();
  });

  it("does not call the API when validation fails", async () => {
    const spy = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(INFO_URL, spy));
    renderForm({ address: "" });

    await save();

    expect(await screen.findByText("กรุณากรอกที่อยู่")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});
