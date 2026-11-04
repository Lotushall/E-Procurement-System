import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import VendorInfo from "@/app/(public)/profiles/vendor-info/page";
import { makeCompanyVendorProfile, makeIndividualVendorProfile } from "@/tests/fixtures/vendor-profile";
import { renderWithQueryClient } from "@/tests/helpers/query-client";
import { apiUrl, server } from "@/tests/msw/server";

const PROFILE_URL = apiUrl("/api/v1/vendor/profile");
const INFO_URL = apiUrl("/api/v1/vendor/info");

describe("VendorInfo page", () => {
  it("shows the heading and a spinner while the profile loads", () => {
    server.use(http.get(PROFILE_URL, () => new Promise(() => {})));

    renderWithQueryClient(<VendorInfo />);

    expect(screen.getByRole("heading", { name: "ข้อมูลบริษัท / นิติบุคคล" })).toBeInTheDocument();
    expect(screen.getByText("ข้อมูลนี้จะปรากฏในเอกสารการเสนอราคาและสัญญา")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "บันทึกข้อมูล" })).not.toBeInTheDocument();
  });

  it("renders the company form for a company vendor", async () => {
    server.use(http.get(PROFILE_URL, () => HttpResponse.json({ data: makeCompanyVendorProfile() })));

    renderWithQueryClient(<VendorInfo />);

    expect(await screen.findByText("ชื่อบริษัท / นิติบุคคล")).toBeInTheDocument();
    expect(screen.getByText("เลขทะเบียนนิติบุคคล")).toBeInTheDocument();
    expect(screen.queryByText("ชื่อร้านค้า")).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
  });

  it("renders the individual form for an individual vendor", async () => {
    server.use(http.get(PROFILE_URL, () => HttpResponse.json({ data: makeIndividualVendorProfile() })));

    renderWithQueryClient(<VendorInfo />);

    expect(await screen.findByText("ชื่อร้านค้า")).toBeInTheDocument();
    expect(screen.getByText("เลขบัตรประชาชน")).toBeInTheDocument();
    expect(screen.queryByText("ชื่อบริษัท / นิติบุคคล")).not.toBeInTheDocument();
  });

  it.each([404, 500])("stops the spinner and shows a load-error message when the profile request fails (%i)", async (status) => {
    server.use(http.get(PROFILE_URL, () => new HttpResponse(null, { status })));

    renderWithQueryClient(<VendorInfo />);

    expect(await screen.findByText("ไม่สามารถโหลดข้อมูลผู้ค้าได้ กรุณาลองใหม่อีกครั้ง")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("covers the form with an overlay spinner while saving and refetches the profile afterwards", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let profileRequests = 0;
    server.use(
      http.get(PROFILE_URL, () => {
        profileRequests += 1;
        return HttpResponse.json({ data: makeCompanyVendorProfile() });
      }),
      http.post(INFO_URL, async () => {
        await gate;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<VendorInfo />);
    await user.click(await screen.findByRole("button", { name: "บันทึกข้อมูล" }));

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    release();

    await waitFor(() => expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument());
    await waitFor(() => expect(profileRequests).toBe(2));
  });
});
