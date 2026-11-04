import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import Sidebar from "@/app/(public)/profiles/_components/sidebar";
import { signInAs } from "@/tests/helpers/auth";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { setUrl } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const VENDOR_URL = apiUrl("/api/v1/vendor/profile");

const COMPLETE_VENDOR = {
  verificationStatus: "approved",
  detail: { type: "company", address: "1 ถนน", province: "กรุงเทพ", postalCode: "10110" },
  contact: [{ contactName: "a", contactEmail: "a@b.c", contactPhone: "081" }],
  document: [
    "company_certificate",
    "authorized_person_id",
    "vat_registration",
    "shareholder_list",
    "financial_statement",
  ].map((documentType) => ({ documentType })),
};

function signInVendor(emailVerifiedAt: string | null) {
  signInAs({ userType: "company", emailVerifiedAt });
}

// จุดแดงเตือนเป็น span ลูกของ span.relative ที่ครอบ icon
function warningDot(label: string) {
  const link = screen.getByText(label).closest("a")!;
  return link.querySelector("span.relative > span");
}

describe("profiles Sidebar", () => {
  it("links the four profile sections", () => {
    signInVendor("2026-01-01");
    server.use(http.get(VENDOR_URL, () => HttpResponse.json({ data: COMPLETE_VENDOR })));
    renderWithQueryClient(<Sidebar />);

    expect(screen.getByText("บัญชี").closest("a")).toHaveAttribute("href", "/profiles");
    expect(screen.getByText("ข้อมูลบริษัท").closest("a")).toHaveAttribute("href", "/profiles/vendor-info");
    expect(screen.getByText("ผู้ติดต่อ").closest("a")).toHaveAttribute("href", "/profiles/contract");
    expect(screen.getByText("เอกสารประกอบ").closest("a")).toHaveAttribute("href", "/profiles/document");
  });

  it("highlights only the item matching the current path", () => {
    setUrl("/profiles/contract");
    signInVendor("2026-01-01");
    server.use(http.get(VENDOR_URL, () => HttpResponse.json({ data: COMPLETE_VENDOR })));
    renderWithQueryClient(<Sidebar />);

    expect(screen.getByText("ผู้ติดต่อ").closest("a")).toHaveClass("text-red-700");
    expect(screen.getByText("บัญชี").closest("a")).not.toHaveClass("text-red-700");
    expect(screen.getByText("เอกสารประกอบ").closest("a")).not.toHaveClass("text-red-700");
  });

  it("shows no warning markers for a complete, verified vendor", async () => {
    signInVendor("2026-01-01");
    server.use(http.get(VENDOR_URL, () => HttpResponse.json({ data: COMPLETE_VENDOR })));
    const { queryClient } = renderWithQueryClient(<Sidebar />);

    // รอให้ทั้ง user และ vendor โหลดเสร็จก่อนยืนยันว่าไม่มีจุดเตือน
    await waitFor(() => {
      expect(queryClient.getQueryData(["auth", "user"])).toBeTruthy();
      expect(queryClient.getQueryData(["vendor", "profile"])).toBeTruthy();
    });
    for (const label of ["บัญชี", "ข้อมูลบริษัท", "ผู้ติดต่อ", "เอกสารประกอบ"]) {
      expect(warningDot(label)).toBeNull();
    }
  });

  it("marks every section when the email is unverified and the profile is empty", async () => {
    signInVendor(null);
    server.use(
      http.get(VENDOR_URL, () =>
        HttpResponse.json({ data: { verificationStatus: "pending", detail: { type: "company" }, contact: [], document: [] } }),
      ),
    );
    renderWithQueryClient(<Sidebar />);

    await waitFor(() => {
      for (const label of ["บัญชี", "ข้อมูลบริษัท", "ผู้ติดต่อ", "เอกสารประกอบ"]) {
        expect(warningDot(label)).toBeInTheDocument();
      }
    });
  });

  it("marks only the sections that are incomplete", async () => {
    signInVendor("2026-01-01");
    server.use(
      http.get(VENDOR_URL, () =>
        HttpResponse.json({ data: { ...COMPLETE_VENDOR, contact: [], document: COMPLETE_VENDOR.document } }),
      ),
    );
    renderWithQueryClient(<Sidebar />);

    await waitFor(() => expect(warningDot("ผู้ติดต่อ")).toBeInTheDocument());
    expect(warningDot("บัญชี")).toBeNull();
    expect(warningDot("ข้อมูลบริษัท")).toBeNull();
    expect(warningDot("เอกสารประกอบ")).toBeNull();
  });
});
