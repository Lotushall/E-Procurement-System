import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import Navbar from "@/app/(public)/profiles/_components/navbar";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const VENDOR_URL = apiUrl("/api/v1/vendor/profile");

function mockVendor(profile: Record<string, unknown>) {
  server.use(http.get(VENDOR_URL, () => HttpResponse.json({ data: profile })));
}

describe("profiles Navbar", () => {
  it("shows the heading, description and a back link to the home page", async () => {
    mockVendor({ verificationStatus: "pending" });
    renderWithQueryClient(<Navbar />);

    expect(screen.getByRole("heading", { name: "ข้อมูลผู้ค้า" })).toBeInTheDocument();
    expect(screen.getByText("จัดการข้อมูลบริษัท ผู้ติดต่อ และเอกสารประกอบสำหรับการขึ้นทะเบียน")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "กลับสู่หน้าหลัก" })).toHaveAttribute("href", "/");
    expect(await screen.findByText("กำลังดำเนินการ")).toBeInTheDocument();
  });

  it("shows a skeleton while the vendor profile is loading", () => {
    server.use(http.get(VENDOR_URL, () => new Promise(() => {})));
    const { container } = renderWithQueryClient(<Navbar />);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByText("กำลังดำเนินการ")).not.toBeInTheDocument();
  });

  it.each([
    ["pending", "กำลังดำเนินการ"],
    ["approved", "ขึ้นทะเบียนแล้ว"],
    ["rejected", "ไม่อนุมัติ"],
  ])("shows the %s verification status label", async (status, label) => {
    mockVendor({ verificationStatus: status });
    renderWithQueryClient(<Navbar />);

    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  it("shows no status badge when the vendor has no profile yet", async () => {
    server.use(http.get(VENDOR_URL, () => new HttpResponse(null, { status: 404 })));
    const { container } = renderWithQueryClient(<Navbar />);

    await screen.findByRole("heading", { name: "ข้อมูลผู้ค้า" });
    await waitFor(() => expect(container.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument());
    expect(screen.queryByText("กำลังดำเนินการ")).not.toBeInTheDocument();
    expect(screen.queryByText("ขึ้นทะเบียนแล้ว")).not.toBeInTheDocument();
    expect(screen.queryByText("ไม่อนุมัติ")).not.toBeInTheDocument();
  });

  it("shows the rejection reason only when the profile is rejected and has a remark", async () => {
    mockVendor({ verificationStatus: "rejected", remark: "เอกสารไม่ครบ" });
    renderWithQueryClient(<Navbar />);

    expect(await screen.findByText("เหตุผล: เอกสารไม่ครบ")).toBeInTheDocument();
  });

  it("hides the reason for a rejected profile without a remark", async () => {
    mockVendor({ verificationStatus: "rejected" });
    renderWithQueryClient(<Navbar />);

    await screen.findByText("ไม่อนุมัติ");
    expect(screen.queryByText(/เหตุผล:/)).not.toBeInTheDocument();
  });

  it("hides the remark for a profile that is not rejected", async () => {
    mockVendor({ verificationStatus: "approved", remark: "ผ่านแล้ว" });
    renderWithQueryClient(<Navbar />);

    await screen.findByText("ขึ้นทะเบียนแล้ว");
    expect(screen.queryByText(/เหตุผล:/)).not.toBeInTheDocument();
  });
});
