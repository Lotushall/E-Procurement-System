import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import Document from "@/app/(public)/profiles/document/page";
import { REQUIRED_DOCUMENTS } from "@/app/(public)/profiles/data/document-types";
import {
  makeCompanyVendorProfile,
  makeIndividualVendorProfile,
  makeVendorDocument,
} from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const PROFILE_URL = apiUrl("/api/v1/vendor/profile");

function serveProfile(profile: unknown) {
  server.use(http.get(PROFILE_URL, () => HttpResponse.json({ data: profile })));
}

// แถวเอกสารแต่ละแถวคือกรอบที่ครอบปุ่ม "แนบไฟล์"/"เปลี่ยนไฟล์"
function rows() {
  return screen
    .getAllByRole("button", { name: /แนบไฟล์|เปลี่ยนไฟล์/ })
    .map((button) => button.closest("div.border") as HTMLElement);
}

describe("Document page", () => {
  it("shows the heading and a spinner while loading", () => {
    server.use(http.get(PROFILE_URL, () => new Promise(() => {})));

    renderWithQueryClient(<Document />);

    expect(screen.getByRole("heading", { name: "เอกสารประกอบการขึ้นทะเบียน" })).toBeInTheDocument();
    expect(screen.getByText("เอกสารเหล่านี้จะถูกส่งให้เจ้าหน้าที่ตรวจสอบและอนุมัติ")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /แนบไฟล์/ })).not.toBeInTheDocument();
  });

  it("lists the company document types in order", async () => {
    serveProfile(makeCompanyVendorProfile());

    renderWithQueryClient(<Document />);

    await screen.findAllByRole("button", { name: "แนบไฟล์" });
    const labels = REQUIRED_DOCUMENTS.company.map((doc) => doc.label);
    expect(rows()).toHaveLength(labels.length);
    rows().forEach((row, index) => expect(within(row).getByText(labels[index])).toBeInTheDocument());
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
  });

  it("lists the individual document types, with the optional ones marked", async () => {
    serveProfile(makeIndividualVendorProfile());

    renderWithQueryClient(<Document />);

    await screen.findAllByRole("button", { name: "แนบไฟล์" });
    const labels = REQUIRED_DOCUMENTS.individual.map((doc) => doc.label);
    expect(rows()).toHaveLength(labels.length);
    rows().forEach((row, index) => expect(within(row).getByText(labels[index])).toBeInTheDocument());
    expect(screen.getAllByText("ไม่บังคับ")).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: "เอกสารบังคับ" })).toHaveLength(2);
    expect(screen.queryByText("หนังสือรับรองบริษัท")).not.toBeInTheDocument();
  });

  it("passes each uploaded document to the row with its matching type", async () => {
    serveProfile(
      makeCompanyVendorProfile({
        document: [
          makeVendorDocument({ id: 1, documentType: "company_certificate", fileName: "cert.pdf", status: "approved" }),
          makeVendorDocument({
            id: 2,
            documentType: "vat_registration",
            fileName: "vat.pdf",
            status: "rejected",
            remark: "หมดอายุ",
          }),
          // ชนิดที่ไม่อยู่ในรายการของบริษัทต้องถูกเมินเฉย
          makeVendorDocument({ id: 3, documentType: "citizen_id", fileName: "ignored.png" }),
        ],
      }),
    );

    renderWithQueryClient(<Document />);

    await screen.findAllByRole("button", { name: /แนบไฟล์|เปลี่ยนไฟล์/ });
    const [certificate, authorizedPerson, vat] = rows();
    expect(within(certificate).getByRole("link", { name: "cert.pdf" })).toHaveAttribute(
      "href",
      "http://localhost:3000/api/v1/vendor/document/1/view",
    );
    expect(within(certificate).getByText("อนุมัติแล้ว")).toBeInTheDocument();
    expect(within(authorizedPerson).getByText("ยังไม่มีเอกสาร")).toBeInTheDocument();
    expect(within(vat).getByText("vat.pdf", { exact: false })).toBeInTheDocument();
    expect(within(vat).getByText("เหตุผล: หมดอายุ")).toBeInTheDocument();
    expect(screen.queryByText("ignored.png")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "เปลี่ยนไฟล์" })).toHaveLength(2);
  });

  it("treats a profile with no document list as having no uploads", async () => {
    serveProfile(makeCompanyVendorProfile({ document: undefined }));

    renderWithQueryClient(<Document />);

    await screen.findAllByRole("button", { name: "แนบไฟล์" });
    expect(screen.getAllByText("ยังไม่มีเอกสาร")).toHaveLength(REQUIRED_DOCUMENTS.company.length);
  });

  it.each([404, 500])("stops the spinner and shows a load-error message when the profile request fails (%i)", async (status) => {
    server.use(http.get(PROFILE_URL, () => HttpResponse.json({}, { status })));

    renderWithQueryClient(<Document />);

    await screen.findByRole("heading", { name: "เอกสารประกอบการขึ้นทะเบียน" });
    expect(await screen.findByText("ไม่สามารถโหลดข้อมูลผู้ค้าได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /แนบไฟล์/ })).not.toBeInTheDocument();
  });
});
