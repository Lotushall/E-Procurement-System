import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SortingState } from "@tanstack/react-table";
import { http, HttpResponse } from "msw/http";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import {
  columns,
  DocumentStatusCount,
  getVendorContact,
  getVendorDisplayName,
  VENDOR_TYPE_ICON,
  VENDOR_TYPE_LABEL,
} from "@/app/dashboard/vendors/_components/table/columns";
import { DataTable } from "@/components/ui/data-table";
import type { VendorProfile } from "@/lib/vendor/profile/types";
import { makeVendorListItem } from "@/tests/fixtures/vendor-approval";
import {
  makeCompanyVendorProfile,
  makeIndividualVendorProfile,
  makeVendorContact,
} from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

function renderTable(data: VendorProfile[], onSortingChange = vi.fn(), sorting: SortingState = []) {
  renderWithQueryClient(
    <DataTable
      columns={columns}
      data={data}
      pageCount={1}
      total={data.length}
      pagination={{ pageIndex: 0, pageSize: 20 }}
      onPaginationChange={vi.fn()}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />,
  );
  return { onSortingChange, user: userEvent.setup() };
}

const dataRow = (index = 0) => screen.getAllByRole("row")[index + 1];
// ลำดับ cell: ผู้ค้า, ประเภท, หมวด, ติดต่อ, วันที่สมัคร, สถานะ, สถานะเอกสาร, Actions
const cell = (row: HTMLElement, index: number) => within(row).getAllByRole("cell")[index];

describe("columns — header", () => {
  it("renders the eight column headers", () => {
    renderTable([makeVendorListItem()]);

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "ผู้ค้า",
      "ประเภท",
      "หมวดสินค้า/บริการ",
      "ติดต่อ",
      "วันที่สมัคร",
      "สถานะ",
      "สถานะเอกสาร",
      "Actions",
    ]);
  });

  it.each([
    ["ผู้ค้า", "name"],
    ["ประเภท", "user_type"],
    ["หมวดสินค้า/บริการ", "business_type"],
    ["วันที่สมัคร", "created_at"],
  ])("sorts by %s through the header button", async (label, id) => {
    const { user, onSortingChange } = renderTable([makeVendorListItem()]);

    await user.click(screen.getByRole("button", { name: label }));

    expect(onSortingChange).toHaveBeenCalledTimes(1);
    const updater = onSortingChange.mock.calls[0][0];
    expect(typeof updater === "function" ? updater([]) : updater).toEqual([{ id, desc: false }]);
  });

  it.each(["ติดต่อ", "สถานะ", "สถานะเอกสาร", "Actions"])("has no sort button on %s", (label) => {
    renderTable([makeVendorListItem()]);

    expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
  });
});

describe("columns — company vendor row", () => {
  const vendor = makeCompanyVendorProfile({
    id: 42,
    verificationStatus: "approved",
    created_at: "2026-03-05T10:00:00.000000Z",
    detail: { companyName: "บริษัท ตัวอย่าง จำกัด", businessType: "ซื้อขาย" },
    contact: [makeVendorContact({ contactPhone: "0812345678", isMainContact: true })],
    documentStatusCounts: { approved: 2, pending: 1, rejected: 0 },
  });

  it("shows name as a link to the detail page with initials", () => {
    renderTable([vendor]);

    const link = within(cell(dataRow(), 0)).getByRole("link", { name: /บริษัท ตัวอย่าง จำกัด/ });
    expect(link).toHaveAttribute("href", "/dashboard/vendors/detail?id=42");
    expect(link).toHaveTextContent("บต");
  });

  it("shows the type, business type, formatted contact and registration date", () => {
    renderTable([vendor]);

    expect(cell(dataRow(), 1)).toHaveTextContent("นิติบุคคล");
    expect(cell(dataRow(), 2)).toHaveTextContent("ซื้อขาย");
    expect(cell(dataRow(), 3)).toHaveTextContent("081-234-5678");
    expect(cell(dataRow(), 4)).toHaveTextContent("05-03-2026");
  });

  it("shows the status badge", () => {
    renderTable([vendor]);

    expect(cell(dataRow(), 5)).toHaveTextContent("อนุมัติแล้ว");
  });

  it("shows only document statuses with a non-zero count", () => {
    renderTable([vendor]);

    const docs = cell(dataRow(), 6);
    expect(within(docs).getByLabelText("อนุมัติแล้ว 2 ฉบับ")).toHaveTextContent("2");
    expect(within(docs).getByLabelText("รอตรวจสอบ 1 ฉบับ")).toHaveTextContent("1");
    expect(within(docs).queryByLabelText(/ถูกปฏิเสธ/)).not.toBeInTheDocument();
  });
});

describe("columns — individual vendor row", () => {
  it("uses the store name and the individual type label", () => {
    renderTable([
      makeIndividualVendorProfile({ id: 3, verificationStatus: "rejected", detail: { storeName: "ร้านสมชาย" } }),
    ]);

    expect(within(cell(dataRow(), 0)).getByRole("link", { name: /ร้านสมชาย/ })).toHaveAttribute(
      "href",
      "/dashboard/vendors/detail?id=3",
    );
    expect(cell(dataRow(), 1)).toHaveTextContent("บุคคลธรรมดา");
    expect(cell(dataRow(), 5)).toHaveTextContent("ถูกปฏิเสธ");
  });
});

describe("columns — fallbacks", () => {
  it("shows - for an empty business type", () => {
    renderTable([makeCompanyVendorProfile({ detail: { businessType: "" } })]);

    expect(cell(dataRow(), 2)).toHaveTextContent(/^-$/);
  });

  it("shows - for contact when a company has no contacts", () => {
    renderTable([makeCompanyVendorProfile({ contact: [] })]);

    expect(cell(dataRow(), 3)).toHaveTextContent(/^-$/);
  });

  it("shows - for document status when there are no counts", () => {
    renderTable([makeVendorListItem({ documentStatusCounts: undefined })]);

    expect(cell(dataRow(), 6)).toHaveTextContent(/^-$/);
  });

  it("shows - for document status when every count is zero", () => {
    renderTable([makeVendorListItem({ documentStatusCounts: { approved: 0, pending: 0, rejected: 0 } })]);

    expect(cell(dataRow(), 6)).toHaveTextContent(/^-$/);
  });

  it("renders a rejected document count", () => {
    renderTable([makeVendorListItem({ documentStatusCounts: { approved: 0, pending: 0, rejected: 3 } })]);

    expect(within(cell(dataRow(), 6)).getByLabelText("ถูกปฏิเสธ 3 ฉบับ")).toBeInTheDocument();
  });
});

describe("getVendorContact", () => {
  it("prefers the main contact's phone, formatted", () => {
    const vendor = makeCompanyVendorProfile({
      contact: [
        makeVendorContact({ id: 1, contactPhone: "0211111111", isMainContact: false }),
        makeVendorContact({ id: 2, contactPhone: "0899999999", isMainContact: true }),
      ],
    });

    expect(getVendorContact(vendor)).toBe("089-999-9999");
  });

  it("falls back to the first contact when none is main", () => {
    const vendor = makeCompanyVendorProfile({
      contact: [
        makeVendorContact({ contactPhone: "021234567", isMainContact: false }),
        makeVendorContact({ contactPhone: "0899999999", isMainContact: false }),
      ],
    });

    expect(getVendorContact(vendor)).toBe("02-123-4567");
  });

  it("falls back to the contact's email when the phone is empty", () => {
    const vendor = makeCompanyVendorProfile({
      contact: [makeVendorContact({ contactPhone: "", contactEmail: "a@b.co", isMainContact: true })],
    });

    expect(getVendorContact(vendor)).toBe("a@b.co");
  });

  it("returns null when the contact has neither phone nor email", () => {
    const vendor = makeCompanyVendorProfile({
      contact: [makeVendorContact({ contactPhone: "", contactEmail: "" })],
    });

    expect(getVendorContact(vendor)).toBeNull();
  });

  it("uses an individual's own phone when there are no contacts", () => {
    const vendor = makeIndividualVendorProfile({ contact: [], detail: { phone: "0812345678", email: "own@x.co" } });

    expect(getVendorContact(vendor)).toBe("081-234-5678");
  });

  it("uses an individual's own email when the phone is empty", () => {
    const vendor = makeIndividualVendorProfile({ contact: [], detail: { phone: "", email: "own@x.co" } });

    expect(getVendorContact(vendor)).toBe("own@x.co");
  });

  it("returns null for an individual with no contact data at all", () => {
    const vendor = makeIndividualVendorProfile({ contact: [], detail: { phone: "", email: "" } });

    expect(getVendorContact(vendor)).toBeNull();
  });

  it("handles a vendor whose contact list is missing", () => {
    const vendor = makeCompanyVendorProfile();
    delete (vendor as Partial<VendorProfile>).contact;

    expect(getVendorContact(vendor)).toBeNull();
  });
});

describe("helpers", () => {
  it("getVendorDisplayName picks the company or store name", () => {
    expect(getVendorDisplayName(makeCompanyVendorProfile({ detail: { companyName: "ก จำกัด" } }))).toBe("ก จำกัด");
    expect(getVendorDisplayName(makeIndividualVendorProfile({ detail: { storeName: "ร้าน ข" } }))).toBe("ร้าน ข");
  });

  it("exposes a label and icon for both vendor types", () => {
    expect(VENDOR_TYPE_LABEL).toEqual({ company: "นิติบุคคล", individual: "บุคคลธรรมดา" });
    expect(VENDOR_TYPE_ICON.company).toBeDefined();
    expect(VENDOR_TYPE_ICON.individual).toBeDefined();
  });

  it.each([
    ["approved", "อนุมัติแล้ว 4 ฉบับ", "text-green-800"],
    ["pending", "รอตรวจสอบ 4 ฉบับ", "text-yellow-600"],
    ["rejected", "ถูกปฏิเสธ 4 ฉบับ", "text-red-600"],
  ] as const)("DocumentStatusCount renders %s with its label and tone", (status, label, tone) => {
    render(<DocumentStatusCount status={status} count={4} />);

    const badge = screen.getByLabelText(label);
    expect(badge).toHaveTextContent("4");
    expect(badge.querySelector("svg")).toHaveClass(tone);
  });
});

describe("columns — actions", () => {
  it("opens the delete confirmation for the row's vendor and deletes it", async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(apiUrl("/api/v1/vendors/:id"), ({ params }) => {
        deleted(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderTable([makeCompanyVendorProfile({ id: 42, detail: { companyName: "บริษัท ตัวอย่าง จำกัด" } })]);

    await user.click(within(cell(dataRow(), 7)).getByRole("button", { name: "ลบผู้ค้า" }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent('ต้องการลบผู้ค้า "บริษัท ตัวอย่าง จำกัด" ใช่หรือไม่?');
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "ลบผู้ค้า" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ลบผู้ค้าสำเร็จ"));
    expect(deleted).toHaveBeenCalledWith("42");
  });

  it("renders one delete button per row", () => {
    renderTable([makeVendorListItem({ id: 1 }), makeVendorListItem({ id: 2 })]);

    expect(screen.getAllByRole("button", { name: "ลบผู้ค้า" })).toHaveLength(2);
  });
});
