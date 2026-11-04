import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { VendorCard } from "@/app/dashboard/vendors/_components/table/vendor-card";
import type { VendorProfile } from "@/lib/vendor/profile/types";
import {
  makeCompanyVendorProfile,
  makeIndividualVendorProfile,
  makeVendorContact,
} from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

function renderCard(vendor: VendorProfile, { canDelete = true } = {}) {
  renderWithQueryClient(<VendorCard vendor={vendor} canDelete={canDelete} />);
  return userEvent.setup();
}

// dd ที่ชื่อ dt (aria-label ของไอคอน) -> dd ที่อยู่ถัดไป
function valueOf(label: string) {
  return screen.getByLabelText(label).closest("dt")!.nextElementSibling as HTMLElement;
}

describe("VendorCard — company", () => {
  const vendor = makeCompanyVendorProfile({
    id: 42,
    verificationStatus: "pending",
    created_at: "2026-03-05T10:00:00.000000Z",
    detail: { companyName: "บริษัท ตัวอย่าง จำกัด", businessType: "ซื้อขาย" },
    contact: [makeVendorContact({ contactPhone: "0812345678" })],
    documentStatusCounts: { approved: 1, pending: 2, rejected: 3 },
  });

  it("shows the name as a link to the detail page, with initials and the avatar tone", () => {
    renderCard(vendor);

    const link = screen.getByRole("link", { name: /บริษัท ตัวอย่าง จำกัด/ });
    expect(link).toHaveAttribute("href", "/dashboard/vendors/detail?id=42");
    expect(link).toHaveTextContent("บต");
    expect(link.firstElementChild).toHaveClass("bg-blue-700");
  });

  it("shows the type chip and the status badge", () => {
    renderCard(vendor);

    expect(screen.getByText("นิติบุคคล")).toBeInTheDocument();
    expect(screen.getByText("รอตรวจสอบ")).toBeInTheDocument();
  });

  it("shows business type, contact, registration date and every document count", () => {
    renderCard(vendor);

    expect(valueOf("หมวดสินค้า/บริการ")).toHaveTextContent("ซื้อขาย");
    expect(valueOf("ติดต่อ")).toHaveTextContent("081-234-5678");
    expect(valueOf("วันที่สมัคร")).toHaveTextContent("สมัครเมื่อ 05-03-2026");
    const docs = valueOf("สถานะเอกสาร");
    expect(within(docs).getByLabelText("อนุมัติแล้ว 1 ฉบับ")).toBeInTheDocument();
    expect(within(docs).getByLabelText("รอตรวจสอบ 2 ฉบับ")).toBeInTheDocument();
    expect(within(docs).getByLabelText("ถูกปฏิเสธ 3 ฉบับ")).toBeInTheDocument();
  });
});

describe("VendorCard — individual", () => {
  it("shows the store name, individual type and amber avatar", () => {
    renderCard(makeIndividualVendorProfile({ id: 3, detail: { storeName: "ร้านสมชาย" } }));

    const link = screen.getByRole("link", { name: /ร้านสมชาย/ });
    expect(link.firstElementChild).toHaveClass("bg-amber-700");
    expect(screen.getByText("บุคคลธรรมดา")).toBeInTheDocument();
  });
});

describe("VendorCard — fallbacks", () => {
  it("shows - for empty business type and missing contact, and a no-documents note", () => {
    renderCard(
      makeCompanyVendorProfile({ detail: { businessType: "" }, contact: [], documentStatusCounts: undefined }),
    );

    expect(valueOf("หมวดสินค้า/บริการ")).toHaveTextContent(/^-$/);
    expect(valueOf("ติดต่อ")).toHaveTextContent(/^-$/);
    expect(valueOf("สถานะเอกสาร")).toHaveTextContent("ยังไม่มีเอกสาร");
  });

  it("shows the no-documents note when every count is zero", () => {
    renderCard(makeCompanyVendorProfile({ documentStatusCounts: { approved: 0, pending: 0, rejected: 0 } }));

    expect(valueOf("สถานะเอกสาร")).toHaveTextContent("ยังไม่มีเอกสาร");
  });

  it("shows only the non-zero document counts", () => {
    renderCard(makeCompanyVendorProfile({ documentStatusCounts: { approved: 0, pending: 5, rejected: 0 } }));

    const docs = valueOf("สถานะเอกสาร");
    expect(within(docs).getByLabelText("รอตรวจสอบ 5 ฉบับ")).toBeInTheDocument();
    expect(within(docs).queryByLabelText(/อนุมัติแล้ว|ถูกปฏิเสธ/)).not.toBeInTheDocument();
  });

  it("shows - for an unparsable registration date", () => {
    renderCard(makeCompanyVendorProfile({ created_at: "not-a-date" }));

    expect(valueOf("วันที่สมัคร")).toHaveTextContent("สมัครเมื่อ -");
  });
});

describe("VendorCard — options menu", () => {
  const vendor = makeCompanyVendorProfile({ id: 42, detail: { companyName: "บริษัท ตัวอย่าง จำกัด" } });

  it("offers view details and delete", async () => {
    const user = renderCard(vendor);

    await user.click(screen.getByRole("button", { name: "ตัวเลือกของ บริษัท ตัวอย่าง จำกัด" }));

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["ดูรายละเอียด", "ลบ"]);
  });

  it("offers only view details without vendors.delete", async () => {
    const user = renderCard(vendor, { canDelete: false });

    await user.click(screen.getByRole("button", { name: "ตัวเลือกของ บริษัท ตัวอย่าง จำกัด" }));

    const items = await screen.findAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["ดูรายละเอียด"]);
    expect(screen.queryByRole("menuitem", { name: "ลบ" })).not.toBeInTheDocument();
  });

  it("navigates to the detail page from ดูรายละเอียด", async () => {
    const user = renderCard(vendor);

    await user.click(screen.getByRole("button", { name: "ตัวเลือกของ บริษัท ตัวอย่าง จำกัด" }));
    await user.click(await screen.findByRole("menuitem", { name: "ดูรายละเอียด" }));

    expect(router.push).toHaveBeenCalledExactlyOnceWith("/dashboard/vendors/detail?id=42");
  });

  it("opens the delete confirmation from ลบ and deletes the vendor", async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(apiUrl("/api/v1/vendors/:id"), ({ params }) => {
        deleted(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = renderCard(vendor);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ตัวเลือกของ บริษัท ตัวอย่าง จำกัด" }));
    await user.click(await screen.findByRole("menuitem", { name: "ลบ" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent('ต้องการลบผู้ค้า "บริษัท ตัวอย่าง จำกัด" ใช่หรือไม่?');
    await user.click(within(dialog).getByRole("button", { name: "ลบผู้ค้า" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ค้าสำเร็จ"));
    expect(deleted).toHaveBeenCalledWith("42");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("closes the delete confirmation on cancel without deleting", async () => {
    const user = renderCard(vendor);

    await user.click(screen.getByRole("button", { name: "ตัวเลือกของ บริษัท ตัวอย่าง จำกัด" }));
    await user.click(await screen.findByRole("menuitem", { name: "ลบ" }));
    await user.click(await screen.findByRole("button", { name: "ยกเลิก" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
